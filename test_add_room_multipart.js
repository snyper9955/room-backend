const axios = require('axios');
const FormData = require('form-data');

async function testAddRoomMultipart() {
  try {
    const data = new FormData();
    data.append('roomNumber', '222');
    data.append('price', '6000');
    data.append('type', 'Double');
    data.append('amenities', 'WiFi');
    data.append('amenities', 'AC');
    data.append('description', 'Test multipart room');
    
    const response = await axios.post('http://localhost:5000/api/rooms', data, {
      headers: data.getHeaders()
    });
    console.log('SUCCESS:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('ERROR STATUS:', error.response.status);
      console.log('ERROR DATA:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('ERROR MESSAGE:', error.message);
    }
  }
}

testAddRoomMultipart();
