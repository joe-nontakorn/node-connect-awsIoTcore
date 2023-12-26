const express = require('express');
const mongoose = require('mongoose');
const awsIot = require('aws-iot-device-sdk');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid'); // Import uuid

const { Schema } = mongoose;

const app = express();

const dataSchema = new Schema({
  topic: String,
  payload: String,
  receivedAt: Date
});

const DataModel = mongoose.model('test', dataSchema);

// เชื่อมต่อ MongoDB
mongoose.connect('mongodb://localhost:27017/aws_iot')
  .then(() => {
    console.log('เชื่อมต่อกับ MongoDB สำเร็จแล้ว!');
  })
  .catch((err) => {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ MongoDB:', err.message);
  });

  const device = awsIot.device({
    keyPath: './iot_test.private.key',
    certPath: './iot_test.cert.pem',
    caPath: './root-CA.crt',
    clientId: 'sdk-nodejs-v2',
    host: 'a1gswe0909py39-ats.iot.ap-southeast-1.amazonaws.com'
  });
  
  function getRandomTemperature() {
    return Math.floor(Math.random() * 50); // ตัวอย่างการสุ่มค่า 0-50
  }
  
  function getRandomHumidity() {
    return Math.floor(Math.random() * 100); // ตัวอย่างการสุ่มค่า 0-100
  }
  
  cron.schedule('*/50 * * * * *', () => {
    const dataToSend = {
        "id": uuidv4(),// Generate random UUID
        "temperature": getRandomTemperature(),
        "humidity": getRandomHumidity(),
        "status": "on"
      
    };
  
    device.publish('sdk/test/js', JSON.stringify(dataToSend), (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        console.log('Data sent to AWS IoT Core');
      }
    });
  });
  
  device.on('connect', function() {
    console.log('Connected to AWS IoT Core');
    
    // Subscribe to a topic
    device.subscribe('sdk/test/js', function(err) {
      if (err) {
        console.error('Error subscribing to topic:', err);
      } else {
        console.log('Subscribed to topic');
      }
    });
    
  });
  
  // Handle incoming messages
  device.on('message', function(topic, payload) {
    console.log('Message received:', topic, payload.toString());
  
    const dataPayload = JSON.parse(payload.toString());
  
    const data = new DataModel({
      topic: topic,
      payload: JSON.stringify({
        id: dataPayload.id,
        temperature: parseInt(dataPayload.temperature),
        humidity: parseInt(dataPayload.humidity),
        status: dataPayload.status
      }),
      receivedAt: new Date()
    });
  
    data.save()
      .then(savedData => {
        console.log('บันทึกข้อมูลลงใน MongoDB เรียบร้อย:', savedData);
      })
      .catch(err => {
        console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูลลงใน MongoDB:', err);
      });
  });
  
  
  const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server กำลังทำงานที่พอร์ต ${PORT}`);
});
