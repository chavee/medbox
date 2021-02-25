let scan_job; 
let write_job;

function clearScanJob() {
    scan_job = {
        name : '',
        manufacturer_data : '',
        callback : ''
    }
}
clearScanJob();

function clearWriteJob() {
    write_job = {
        uuid : '',
        service: '',
        characteristic : '',
        callback : ''
    }
}
clearWriteJob();


function logtoHTML(input, header = ''){
    //alert(input)
    let out = input;
    if (typeof(input) == 'object') {
      try {
          out =  JSON.stringify(input, undefined, 4);
      }
      catch(e) {
          alert(e);
      }
    }

    let debugbox = document.getElementById("devicelist");
    if (debugbox) {
      if (header) {
          header = ' '+header+' ';
      }
      debugbox.innerHTML = out + '<br>---'+ header +'-------------------------<br>' + document.getElementById("devicelist").innerHTML;
    }
}


function swapFirst2ByteOnHex(hexstr) {
    return hexstr.substr(2,2)+hexstr.substr(0,2)+hexstr.substr(4);
}

function isBoxMatched(target, found) {
    let n_target = target.toLowerCase();
    let n_found = found.toLowerCase();

    if (n_found == n_target) return true;
    if (n_found == swapFirst2ByteOnHex(n_target)) return true;
    return false;
}

window.addEventListener('oneChatBluetoothCallBackData',  async(e) => {
    let message = '';

    if (!e || !e.detail) {
        return;
    }

    let type = e.detail.type;
    let datastr = e.detail.data;
    let data;

    try {
        data = JSON.parse(datastr);
    }
    catch(e) {
        data = {};
    }

    try {
        if (type == 'return_once_device') {
                let d = data.data;
                mhex = d.manufacturer_data_haxa || d.manufacturer_data_hexa;
                if (mhex) {
                    try {
                        if (scan_job.manufacturer_data && isBoxMatched(scan_job.manufacturer_data , mhex) ) {
                            OneChat_stopScanDevice();
                            if (typeof (scan_job.callback) == 'function') {

                                let arg = {
                                    name : d.bluetooth_name,
                                    uuid : d.uuid,
                                    manufacturer_data : mhex,
                                    state : d.state,
                                    rssi: d.rssi
                                }
                                scan_job.callback(arg);
                                clearScanJob();
                            }
                        }
                    }
                    catch(e) {
                        m = 'error'
                    }
                }
                else {
                    if (scan_job.name && (scan_job.name == d.bluetooth_name)) {
//                        logtoHTML('****** to write --><br>' + JSON.stringify({type, data}));

                        OneChat_stopScanDevice();

                        if (typeof (scan_job.callback) == 'function') {
                            scan_job.callback({
                                round : i,
                                name : d.bluetooth_name,
                                uuid : d.uuid,
                                manufacturer_data : d.manufacturer_data,
                                state : d.state,
                                rssi: d.rssi
                            });
                            clearScanJob();
                        }
                    }
                }

                // message += `
                //     name : ${d.bluetooth_name}<br>
                //     uuid : ${d.uuid}<br>
                //     manufacturer_data : ${mfdata}<br>
                //     state : ${d.state}<br>
                //     rssi : ${d.rssi}<br>
                //     raw : ${d.manufacturer_data}<br>
                // `;


            //logtoHTML(message);
        }
        else if (type == 'write_characteristic_by_uuid') {
            logtoHTML(data);
            if (data) {

                    logtoHTML(data.device_uuid, 'writing data')

                    if (data.device_uuid) {
                        setTimeout(() => {
                            OneChat_disconnectBluetoothByUUID(data.device_uuid);
                            logtoHTML("disconnecting...");
                          }, 2000);

                        if (typeof(write_job.callback) == 'function') {
                            write_job.callback();
                        }
                    }
            }
        }
        else if (type == 'disconnect_bluetooth_by_uuid') {
            logtoHTML("disconnected");
        }
        else {
//            if (type != 'return_once_device'  && type != 'start_scan_bluetooth' &&  type != 'stop_scan_bluetooth' ) {
                //alert(JSON.stringify({type, data}, undefined, 4));
            if (type != 'get_device_service' ) {
                scandebug = false;
                logtoHTML(data, 'general log');
            }
        }
    }
    catch(error) {

    }        
});


let MedBox = function(param) {
    this.logEndpoint = param.logEndpoint;
    this.oneID = param.oneID;
    this.timeout = param.timeout || 10000;
}


MedBox.prototype.log = function(data){
    fetch(this.logEndpoint, {
        method: 'post',
        credentials: 'include',
        mode: 'no-cors',
        redirect: 'follow',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(res => {
        console.log('Success:', res.json);
        alert(JSON.stringify(data));
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Error:', error);
    });
}


MedBox.prototype.openBoxByQRCode = function(qrcode, callback){
      const time_scan = 10000;
      const scandebug = false;
      const TIMEOUT = this.timeout;

      function scanDevice(filter={}, callback) {
          try {
              if (filter.manufacturer_data) {
                  scan_job.manufacturer_data = filter.manufacturer_data;
                  if (callback) {
                      scan_job.callback = callback;
                  }
              }
              else if(filter.name) {
                  scan_job.name = filter.name;
                  if (callback) {
                      scan_job.callback = callback;
                  }
              }
              OneChat_scanDevice(time_scan);
          }
          catch(error) {
        			alert('scanDevice ' + error);
          }
      }

      function unlockBLELock(mid, callback) {
          let timer = 0;
          timer = setTimeout(() => {
              write_job.callback = '';
              callback(404, 'Box not found');
          }, TIMEOUT);

          scanDevice(mid, function(info) {

logtoHTML(info, 'scanDevice found info');

              if (timer) {
                  clearTimeout(timer);
                  timer = 0;
              }
              timer = setTimeout(() => {
                  write_job.callback = '';
                  callback(500, 'Unlock Fail');
              }, TIMEOUT);

              logtoHTML(info, 'writing BLE');

              OneChat_writeCharacteristicByUUID(info.uuid, 'FF00', 'FF01', '0006CC59513C4CAA6116D34BF71000B12EF8', 'hex');

              // webkit.messageHandlers.OneChat_writeCharacteristicByUUID.postMessage({
              //     device_uuid: info.uuid,
              //     service_uuid: 'FF00',
              //     characteristic_uuid: 'FF01',
              //     data: '0006CC59513C4CAA6116D34BF71000B12EF8',
              //     data_type : 'hex'
              // });

              write_job.callback = function() {
                  if (timer) {
                      clearTimeout(timer);
                      timer = 0;
                  }
                  callback(200, 'Unlock OK');
              }
          });
      }

      if(qrcode) {
          let payload = {};
          let data = { "boxid": qrcode.toString() , "oneid": this.oneid, "time": new Date().getTime(), "result": "success"};

          if (qrcode.toLowerCase().startsWith('lys')) {
              payload = {'manufacturer_data':qrcode.substr(3)};
          }
          else {
              payload = {'name': qrcode };
          }
          logtoHTML('Performing BLE scan for' + JSON.stringify(payload));
          unlockBLELock(payload, callback);
      }
}

function MedBoxController(param) {
  	return new MedBox(param);
}
