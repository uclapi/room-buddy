/* eslint-disable react/jsx-filename-extension */
import React from 'react';
import {
  Button,
  Dimensions,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';
import { Location, Permissions, MapView } from 'expo';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import Polyline from '@mapbox/polyline';
import { Card, CardItem, Body, Text } from 'native-base';

import Diary from './Diary';
import { sortRooms, calculateRegion } from './helpers';

const { width, height } = Dimensions.get('window');

const CARD_HEIGHT = height / 4;
const CARD_WIDTH = width - (0.2 * width);


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingVertical: 10,
  },
  endPadding: {
    paddingRight: width - CARD_WIDTH,
  },
  firstCard: {
    marginLeft: (width - CARD_WIDTH) / 2,
  },
  nativeCard: {
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
    overflow: 'hidden',
  },
  textContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

function isRoomEqual(room1, room2) {
  return (
    room1.roomid === room2.roomid &&
    room1.siteid === room2.siteid &&
    room1.classification === room2.classification
  );
}

function isRoomLocationEqual(room1, room2) {
  return (
    room1.location.coordinates.lat === room2.location.coordinates.lat &&
    room1.location.coordinates.lng === room2.location.coordinates.lng
  );
}

const bloomsbury = {
  latitude: 51.5245625,
  longitude: -0.1362288,
  latitudeDelta: 0.00922,
  longitudeDelta: 0.00421,
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      region: bloomsbury,
    };
    this.receivedNewUserLocation = this.receivedNewUserLocation.bind(this);
    this.getUserLocation = this.getUserLocation.bind(this);
    this.setMarkerRef = this.setMarkerRef.bind(this);
  }

  componentWillMount() {
    this.index = 0;
    this.animation = new Animated.Value(0);
  }

  async componentDidMount() {
    const { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status === 'granted') {
      this.watch = await Location.watchPositionAsync({
        enableHighAccuracy: true,
        distanceInterval: 100,
      }, this.receivedNewUserLocation);
    }

    this.animation.addListener(({ value }) => {
      let index = Math.floor((value / CARD_WIDTH) + 0.3);
      if (index >= this.state.rooms.length) {
        index = this.state.rooms.length - 1;
      }
      if (index <= 0) {
        index = 0;
      }

      clearTimeout(this.regionTimeout);
      this.regionTimeout = setTimeout(() => {
        if (this.index !== index) {
          this.index = index;
          this.setState({ roomInFocus: this.state.rooms[index] });
          this.map.animateToRegion(
            calculateRegion(this.state.rooms[index], this.getUserLocation()),
            350,
          );
          this.markers.map(marker => marker.hideCallout());
          this.markers[index].showCallout();
        }
      }, 10);
    });
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.data.loading) {
      const sortedRooms = sortRooms(nextProps.data.freeRooms, this.getUserLocation());
      this.setState({
        roomInFocus: sortedRooms[0],
        rooms: sortedRooms,
        region: calculateRegion(sortedRooms[0], this.getUserLocation()),
      });
    }
  }

  componentWillUnmount() {
    this.watch.remove();
  }

  // https://medium.com/@ali_oguzhan/react-native-maps-with-google-directions-api-bc716ed7a366
  async getPath(startLoc, destinationLoc) {
    const resp = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc}&destination=${destinationLoc}&mode=walking`);
    const respJson = await resp.json();
    // console.log(respJson);
    const points = Polyline.decode(respJson.routes[0].overview_polyline.points);
    const coords = points.map(point => (
      {
        latitude: point[0],
        longitude: point[1],
      }
    ));
    this.setState({ coordsToRoomInFocus: coords });
  }

  getUserLocation() {
    if (this.state.userLocation) {
      return this.state.userLocation;
    }
    return {
      coords: {
        latitude: bloomsbury.latitude,
        longitude: bloomsbury.longitude,
      },
    };
  }

  setMarkerRef(ref, index) {
    if (!this.markers) {
      this.markers = [];
      this.markers[index] = ref;
      this.markers[index].showCallout();
    } else {
      this.markers[index] = ref;
    }
  }

  receivedNewUserLocation(userLocation) {
    this.setState({ userLocation });
  }

  render() {
    if (this.props.data.loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8e1c1c" />
        </View>
      );
    }
    if (this.state.userLocation) {
      this.getPath(
        `${this.state.userLocation.coords.latitude},${this.state.userLocation.coords.longitude}`,
        `${this.state.roomInFocus.location.coordinates.lat},${this.state.roomInFocus.location.coordinates.lng}`,
      );
    }
    return (
      <View style={styles.container}>
        <MapView
          ref={map => this.map = map}
          initialRegion={this.state.region}
          style={styles.container}
          showsUserLocation
          showsIndoors
        >
          {this.state.rooms.map((room, index) => (
            <MapView.Marker
              key={`${room.siteid}-${room.roomid}-${room.classification}`}
              coordinate={
                {
                  latitude: Number(room.location.coordinates.lat),
                  longitude: Number(room.location.coordinates.lng),
                }
              }
              pinColor={isRoomLocationEqual(room, this.state.roomInFocus) ? '#FF0000' : '#000000'}
              title={room.roomname}
              ref={ref => this.setMarkerRef(ref, index)}
            />
          ))}
          <If condition={this.state.coordsToRoomInFocus}>
            <MapView.Polyline
              coordinates={this.state.coordsToRoomInFocus}
              strokeWidth={2}
              strokeColor="red"
            />
          </If>
        </MapView>
        <Animated.ScrollView
          horizontal
          scrollEventThrottle={1}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH} // investigate snapToAlignment
          onScroll={Animated.event(
            [
              {
                nativeEvent: {
                  contentOffset: {
                    x: this.animation,
                  },
                },
              },
            ],
            { useNativeDriver: true },
          )}
          style={styles.scrollView}
          contentContainerStyle={styles.endPadding}
        >
          {this.state.rooms.map((room, index) => (
            <Card style={[styles.nativeCard, index === 0 ? styles.firstCard : null]} key={`${room.siteid}-${room.roomid}-${room.classification}`}>
              <CardItem>
                <Body>
                  <Text style={styles.cardTitle}>{room.roomname}</Text>
                  <Diary room={room} />
                </Body>
              </CardItem>
            </Card>
          ))}
        </Animated.ScrollView>
      </View>
    );
  }
}


export default graphql(gql`
  query getFreeRooms($minutes: Int){
    freeRooms(minutes: $minutes){
      roomid
      roomname
      siteid
      classification
      bookings {
        contact
        description
        startTime
        endTime
        slotid
        weeknumber
        phone
      }
      location {
        coordinates {
          lat
          lng
        }
      }
    }
  }
`, { options: { variables: { minutes: 60 } } })(App);
