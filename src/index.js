const db = require('./db.js');
db.connect((err, client) => {
  if (err) console.error(err);
  
  const io = require('socket.io')({
    path: '/clips'
  });

  const clips = require('./clips.js');
  
  io.on('connection', function(socket) {

    console.log('Client connected.');

    socket.on('get-init', (num) => {
      socket.emit('init-response', clips.getLatestXClips(num));
      console.log('init response sent')
    })
    
    // Disconnect listener
    socket.on('disconnect', function() {
      console.log('Client disconnected.');
    });
  });
  
  io.listen(3000);
  console.log("listening on port 3000");
  
  var latestClip; 
  clips.getLatestClipTime(function (result) {
    console.log(result);
    latestClip = result;
  });  
  
  setInterval( function () {
    clips.go();
    console.log("--------- cache updated -----------");
  }, 30000 );
});