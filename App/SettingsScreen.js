// x in corner, navigation.goBack(null)
import React from 'react';
import { View, Button } from 'react-native';
import { connect } from 'react-redux';
import { SecureStore } from 'expo';
import PropTypes from 'prop-types';

import { logout } from './actions';

class SettingsScreen extends React.Component {
  static navigationOptions = {
    title: 'Settings',
  }
  constructor(props) {
    super(props);
    this.handleLogout = this.handleLogout.bind(this);
  }

  async handleLogout() {
    SecureStore.deleteItemAsync('token');
    this.props.logout();
    this.props.navigation.goBack();
  }
  render() {
    return (
      <View style={{ flex: 1, paddingTop: 40 }}>
        <Button title="Sign out" onPress={() => this.handleLogout()} />
      </View>
    );
  }
}

SettingsScreen.propTypes = {
  logout: PropTypes.func.isRequired,
};


const mapStateToProps = state => ({});

const mapDispatchToProps = {
  logout,
};

export default connect(mapStateToProps, mapDispatchToProps)(SettingsScreen);
