/* eslint-disable react/jsx-filename-extension */
import React from 'react';
import { View, TouchableHighlight, Text, StyleSheet, Image } from 'react-native';
import { StackNavigator, addNavigationHelpers } from 'react-navigation';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';
import { AuthSession, SecureStore, Constants } from 'expo';
import { FontAwesome } from '@expo/vector-icons';
import { Provider, connect } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import PropTypes from 'prop-types';

import App from './App/App';
import SettingsScreen from './App/SettingsScreen';
import { loggedIn } from './App/reducers';
import { logout, login } from './App/actions';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    marginRight: 10,
  },
});
// Todo: use official log in with UCL button
class HomeScreen extends React.Component {
  static propTypes = {
    login: PropTypes.func.isRequired,
    loggedIn: PropTypes.bool.isRequired,
  }
  static navigationOptions = ({ navigation }) => ({
    title: 'UCL Room Buddy',
    headerRight: (
      <FontAwesome
        style={styles.settingsIcon}
        name="gear"
        size={32}
        onPress={() => navigation.navigate('Settings')}
      />
    ),
  })
  constructor(props) {
    super(props);

    this.state = {
      result: null,
      showErrorMessage: false,
    };
  }

  async componentWillMount() {
    let token;
    try {
      token = await SecureStore.getItemAsync('token');
    } catch (e) {
      // pass
    }
    if (token) {
      this.setState({ token });
      this.props.login();
    }
  }

  handlePressAsync = async () => {
    const redirectUrl = AuthSession.getRedirectUrl();
    const result = await AuthSession.startAsync({
      authUrl:
        'https://room-buddy.uclapi.com/oauth/uclapi/login' +
        `&redirect_uri=${encodeURIComponent(redirectUrl)}`,
    });
    this.setState({ result }, async () => {
      if (this.state.result.type === 'success') {
        try {
          await SecureStore.setItemAsync('token', this.state.result.params.token);
          this.setState({ token: this.state.result.params.token });
          this.props.login();
        } catch (e) {
          this.setState({ showErrorMessage: true });
        }
      } else {
        this.setState({ showErrorMessage: true });
      }
    });
  };

  render() {
    if (!this.props.loggedIn) {
      return (
        <View style={styles.container}>
          <TouchableHighlight onPress={this.handlePressAsync}>
            <Image source={require('./assets/signinwithucl.png')} />
          </TouchableHighlight>
          <If condition={this.state.showErrorMessage}>
            <Text>{`An error has occured. Please try again (Error: ${this.state.result.type})`}</Text>
          </If>
        </View>
      );
    }
    const client = new ApolloClient({
      link: new HttpLink({
        uri: 'https://room-buddy.uclapi.com/graphql',
        headers: {
          authorization: this.state.token,
        },
      }),
      cache: new InMemoryCache(),
    });
    return (
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    );
  }
}

const mapStateToProps = state => ({
  loggedIn: state.loggedIn,
});

const mapDispatchToProps = {
  logout,
  login,
};


const AppNavigator = StackNavigator(
  {
    Home: {
      screen: connect(mapStateToProps, mapDispatchToProps)(HomeScreen),
    },
    Settings: {
      screen: SettingsScreen,
    },
  },
  { navigationOptions: { headerStyle: { marginTop: Constants.statusBarHeight } } },
);

const navReducer = (state, action) => {
  const newState = AppNavigator.router.getStateForAction(action, state);
  return newState || state;
};

const store = createStore(combineReducers({
  nav: navReducer,
  loggedIn,
}));

/* eslint-disable react/no-multi-comp */
class AppWithNavigationState extends React.Component {
  render() {
    return (
      <AppNavigator
        navigation={addNavigationHelpers({
            dispatch: this.props.dispatch,
            state: this.props.nav,
        })}
      />
    );
  }
}

const ConnectedAppWithNavigationState = connect(state => ({ nav: state.nav }))(AppWithNavigationState);

export default function root() {
  return (
    <Provider store={store}>
      <ConnectedAppWithNavigationState />
    </Provider>
  );
}
