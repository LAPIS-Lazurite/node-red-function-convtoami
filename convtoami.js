/*
 *  file: convtoami.js
 *
 *  Copyright (C) 2016 Lapis Semiconductor Co., Ltd.
 */

module.exports = function(RED) {

  const index_measure = 0; // 測定回数
  const index_green   = 1; // 緑
  const index_yellow  = 2; // オレンジ
  const index_red     = 3; // 赤

  function Warn(message){
    RED.log.warn("ConvToamiNode: " + message);
  }

  function Info(message){
    RED.log.info("ConvToamiNode: " + message);
  }

  function trim(string){
    var text = string.replace(/^[ 　]*/gim, "").replace(/[ 　]*$/gim, "").replace(/[\n]*$/gim, "").replace(/[\r\n]*$/gim, "");
    return text;
  }

  function ConvToamiEnOceanNode(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    var appKey = config.key;
    this.on('input', function(msg) {

      var data = new Uint8Array(msg.payload);

      var DataLength = (data[1] << 8) + data[2];
      var RawData = data.slice(6, 6 + DataLength);
      var SensorID = RawData.slice(1, 5);
      var SensorData = RawData.slice(5, DataLength - 1);

      // add HTTP Header
      msg.headers= {
        "Content-type" : "application/json",
        "Accept" : "application/json",
        "appKey" : appKey,
      }

      if((SensorID[0] === 0x04 && SensorID[1] === 0x01 && SensorID[2] === 0x78 && SensorID[3] === 0xbd) || // 040178BD
         (SensorID[0] === 0x04 && SensorID[1] === 0x00 && SensorID[2] === 0xd8 && SensorID[3] === 0xab) || // 0400D8AB
         (SensorID[0] === 0x04 && SensorID[1] === 0x01 && SensorID[2] === 0x47 && SensorID[3] === 0x1d)) { // 0401471D
        // 温湿度センサ
        var obj = {
          sdata : {
            n04 : (SensorData[2] * 0.16).toFixed(1), // 温度
            n05 : (SensorData[1] * 0.4).toFixed(1),  // 湿度
          }
        }
        msg.payload = JSON.stringify(obj);
        node.send(msg);
      } else if((SensorID[0] === 0x04 && SensorID[1] === 0x00 && SensorID[2] === 0x3f && SensorID[3] === 0x7e) || // 04003F7E
         (SensorID[0] === 0x04 && SensorID[1] === 0x01 && SensorID[2] === 0x50 && SensorID[3] === 0x63) ||        // 04015063
         (SensorID[0] === 0x04 && SensorID[1] === 0x01 && SensorID[2] === 0x51 && SensorID[3] === 0x1c)) {        // 0401511C
        // 電流センサ
        var obj = {
          sdata : {
            n06 : (((((SensorData[1] & 0xFF) << 4) & 0x0FFF) | ((SensorData[2] & 0xF0) >> 4) & 0x000F) * 0.1).toFixed(1), // 電流
          }
        }
        msg.payload = JSON.stringify(obj);
        node.send(msg);
      } else {
        Warn("Sensor ID not supported : " + Array.apply([], SensorID).join(","));
      }
    });
  }
  RED.nodes.registerType("conv_enocean",ConvToamiEnOceanNode);

  function ConvToamiLazuriteNode(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    var appKey = config.key;
    this.on('input', function(msg) {
      var data = msg.payload.split(',');

      var obj = {
        sdata : {
          n01 : trim(data[index_green]),
          n02 : trim(data[index_yellow]),
          n03 : trim(data[index_red]),
        }
      }
      msg.payload = JSON.stringify(obj);

      // add HTTP Header
      msg.headers= {
        "Content-type" : "application/json",
        "Accept" : "application/json",
        "appKey" : appKey,
      }
      node.send(msg);
    });
  }
  RED.nodes.registerType("conv_lazurite",ConvToamiLazuriteNode);
}
