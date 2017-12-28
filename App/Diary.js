/* eslint-disable react/jsx-filename-extension */
import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import Table from 'react-native-simple-table';
import Moment from 'moment';
import { Text } from 'native-base';


const styles = StyleSheet.create({
  loading: {
    marginTop: 20,
  },
  table: {
    width: '100%',
  },
  diaryHeader: {
    fontWeight: 'bold',
  },
});

const columns = [
  {
    title: 'Start',
    dataIndex: 'cleanStart',
    width: 50,
  },
  {
    title: 'End',
    dataIndex: 'cleanEnd',
    width: 50,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: 150,
  },
  {
    title: 'Contact',
    dataIndex: 'contact',
    width: 110,
  },
];


class Diary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cleanedBookings: [],
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.data.loading) {
      const cleanedBookings = nextProps.data.diary.bookings.map((booking) => {
        const start = new Moment(booking.startTime);
        const end = new Moment(booking.endTime);
        return {
          ...booking,
          cleanStart: start.format('HH:mm'),
          cleanEnd: end.format('HH:mm'),
        };
      });
      this.setState({
        cleanedBookings,
      });
    }
  }

  render() {
    return (
      <Choose>
        <When condition={this.props.data.loading === true}>
          <ActivityIndicator
            animating={this.props.data.loading}
            style={styles.loading}
            size="large"
          />
        </When>
        <When
          condition={
            this.props.data.diary.bookings.length === 0 && this.props.data.loading === false
          }
        >
          <Text>
            {'No bookings in this room today.'}
          </Text>
        </When>
        <Otherwise>
          <View style={styles.table}>
            <Table
              columns={columns}
              dataSource={this.state.cleanedBookings}
            />
          </View>
        </Otherwise>
      </Choose>
    );
  }
}


export default graphql(gql`
  query getDiary($roomid: String, $siteid: String, $date: String) {
    diary(roomid: $roomid, siteid: $siteid, date: $date) {
      bookings {
        contact
        description
        startTime
        endTime
        roomid
        roomname
        siteid
        slotid
        weeknumber
        phone
      }
    }
  }
`, {
    options: (props) => {
      const today = new Moment();
      const date = today.format('YYYY-MM-DD');
      return {
        variables: {
          roomid: props.room.roomid,
          siteid: props.room.siteid,
          date,
        },
      };
    },
  })(Diary);
