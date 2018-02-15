const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);  // deg2rad below
  const dLon = deg2rad(lon2 - lon1);
  const a =
   Math.sin(dLat / 2) * Math.sin(dLat / 2) +
   Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
   Math.sin(dLon / 2) * Math.sin(dLon / 2)
   ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const sortRooms = (freeRooms, position) => {
  let rooms;
  rooms = freeRooms.filter(room => (
    room.location.coordinates
  ));
  rooms = rooms.map((room) => {
    const distance = getDistanceFromLatLonInKm(
      position.coords.latitude,
      position.coords.longitude,
      room.location.coordinates.lat,
      room.location.coordinates.lng,
    );
    const finalRoom = room;
    finalRoom.distance = distance.toPrecision(1) * 1000;
    return finalRoom;
  });

  rooms.sort((a, b) => {
    const distance1 = getDistanceFromLatLonInKm(
      position.coords.latitude,
      position.coords.longitude,
      a.location.coordinates.lat, a.location.coordinates.lng,
    );
    const distance2 = getDistanceFromLatLonInKm(
      position.coords.latitude,
      position.coords.longitude,
      b.location.coordinates.lat, b.location.coordinates.lng,
    );
    if (distance1 > distance2) {
      return 1;
    }

    return -1;
  });

  // Only return the 15 closest rooms
  return rooms.slice(0, 15);
};

function calculateRegion(roomInput, userLocation) {
  const room = {
    lat: Number(roomInput.location.coordinates.lat),
    lng: Number(roomInput.location.coordinates.lng),
  };
  const user = {
    lat: Number(userLocation.coords.latitude),
    lng: Number(userLocation.coords.longitude),
  };
  const mid = {
    lat: (room.lat + user.lat) / 2,
    lng: (room.lng + user.lng) / 2,
  };
  const latitudeDelta = Math.max(room.lat, user.lat) - Math.min(room.lat, user.lat);
  const longitudeDelta = Math.max(room.lng, user.lng) - Math.min(room.lng, user.lng);
  const buffer = x => (x + (0.1 * x));
  return {
    latitude: mid.lat,
    longitude: mid.lng,
    latitudeDelta: latitudeDelta + buffer(latitudeDelta),
    longitudeDelta: longitudeDelta + buffer(longitudeDelta),
  };
}
export { getDistanceFromLatLonInKm, sortRooms, calculateRegion };
