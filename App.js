/* eslint-disable react/jsx-filename-extension */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { StackNavigator, addNavigationHelpers } from 'react-navigation';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';
import { AuthSession, SecureStore, Constants, AppLoading } from 'expo';
import { FontAwesome } from '@expo/vector-icons';
import { Provider, connect } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import PropTypes from 'prop-types';
import Sentry from 'sentry-expo';
import DoubleTap from 'react-native-hardskilled-double-tap';

import App from './App/App';
import { loggedIn } from './App/reducers';
import { logout, login } from './App/actions';

Sentry.config('https://3ffc3641cff24a3cbfb376f347a02240@sentry.io/289925').install();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenLogout: {
    marginRight: 10,
  },
});

class HomeScreen extends React.Component {
  static propTypes = {
    login: PropTypes.func.isRequired,
    loggedIn: PropTypes.bool.isRequired,
    logout: PropTypes.func.isRequired,
  }
  static navigationOptions = ({ navigation }) => ({
    title: 'UCL Room Buddy',
    headerRight: (
      <TouchableOpacity
        onLongPress={async () => navigation.state.params.logout()}
        style={styles.hiddenLogout}
      >
        <Text style={{ color: 'transparent' }}>Hidden signout</Text>
      </TouchableOpacity>
    ),
  })
  constructor(props) {
    super(props);

    this.state = {
      result: null,
      showErrorMessage: false,
      loadingTokenFromStorage: true,
    };
    this.loadTokenFromStorage = this.loadTokenFromStorage.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  componentDidMount() {
    this.props.navigation.setParams({ logout: this.handleLogout });
  }

  async handleLogout() {
    SecureStore.deleteItemAsync('token');
    this.props.logout();
  }

  async loadTokenFromStorage() {
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
    if (this.state.loadingTokenFromStorage) {
      return (
        <AppLoading
          startAsync={this.loadTokenFromStorage}
          onFinish={() => this.setState({ loadingTokenFromStorage: false })}
          onError={console.warn}
        />
      );
    }
    if (!this.props.loggedIn) {
      return (
        <View style={styles.container}>
          <TouchableOpacity onPress={this.handlePressAsync}>
            <Image source={require('./assets/signinwithucl.png')} />
          </TouchableOpacity>
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
