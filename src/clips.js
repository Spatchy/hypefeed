const got = require('got');
const fs = require('fs');
const { Http2ServerRequest } = require('http2');
const { connected } = require('process');

const localPath = "/home/hypefeed/";
const srcPath = localPath + "src/";
const secretsPath = localPath + "secrets/";
const cachePath = localPath + "caches/";
const clipsPath = cachePath + "clips/";


function retreiveAppCredentials() {
  let credentials = JSON.parse(fs.readFileSync(`${secretsPath}twitch-credentials.json`));
  return credentials;
}

function fetchAppAccessToken( appId, appSecret ) { 


  (async () => {
    try {
      const body = await got.post(`https://id.twitch.tv/oauth2/token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`).json();
      saveAppAccessToken(body);
    } catch (error) {
      console.log(error);
      //=> 'Internal server error ...'
    }
  })();
}

function fetchClips( appId, accessToken ) {
  var currentTime = Date.now()
  var FourteenDaysAgo = currentTime - 1209600000 // milliseconds in 14 days
  
  var formattedCurrentTime = new Date(currentTime).toISOString();
  var formattedFourteenDaysAgo = new Date (FourteenDaysAgo).toISOString();

  var HTTPheaders = {
    "Authorization": accessToken,
    "Client-Id": appId
  };

  (async () => {
    try {
      const body = await got.get(`https://api.twitch.tv/helix/clips?broadcaster_id=58429793&started_at=${formattedFourteenDaysAgo}&ended_at=${formattedCurrentTime}`, {headers:HTTPheaders}).json();
      cacheClips(body);
      //=> '<!doctype html> ...'
    } catch (error) {
      console.log(error);
      //=> 'Internal server error ...'
    }
  })();
}

function saveAppAccessToken( tokenResponse ) {
  var expiryTime = tokenResponse["expires_in"] + Math.floor((Date.now()/1000));
  var tokenString = "Bearer " + tokenResponse["access_token"];

  var jsonString = `{"expiry_time":"${expiryTime}", "token_string":"${tokenString}"}`

  console.log("SAVING NEW ACCESS TOKEN");
  fs.writeFile(`${secretsPath}twitch-access-token.json`, jsonString, function (err) {
    if (err) return console.log(err);
  });
}

function retreiveAppAccessToken() {
  let accessToken = JSON.parse(fs.readFileSync(`${secretsPath}twitch-access-token.json`));
  console.log("access token retrieved from file");
  return accessToken;
}

function checkAccessTokenExpired( accessToken ) {
  try {
    var timeRemaining = accessToken["expiry_time"] - Math.floor((Date.now()/1000));
    console.log("there are "+ timeRemaining + " seconds left on the token");
  } catch {
    // if there's an error, token needs refreshing
    console.log("ERROR: access token malformed or unusable");
    return true;
  }

  // if there is less than a day remaining on the token:
  if(timeRemaining <= 86400) {
    return true;
  }
  return false;
}

function cacheClips( clipsResponse ) {
  clipsResponse["data"].forEach(clip => {
    var timeString = clip["created_at"];
    var ymdhms = timeString.split(/[^0-9]/g); // results in array of [year, month, day, hour, minute, second]
    var timeStamp = Date.UTC(ymdhms[0], ymdhms[1]-1, ymdhms[2], ymdhms[3], ymdhms[4], ymdhms[5]); // months start at 0 apparently
    var jsonString = JSON.stringify(clip);

    fs.writeFile(`${clipsPath}${timeStamp}.json`, jsonString, function (err) {
      if (err) return console.log(err);
    });
  });
  
}

// Checks cache for clips since given timestamp 
function checkForNewClips( since ) {
  console.log("CHECKING FOR NEW CLIPS SINCE " + since);
  var fileArray = fs.readdirSync(clipsPath).reverse(); // newest first

  var isOldLatest = (element) => element.split(".json")[0] <= since; // finds the first element with a timestamp earlier or equal to 'since'
  oldLatestIndex = fileArray.findIndex(isOldLatest);

  var newClipNamesArray = fileArray.slice(0, oldLatestIndex);
  var dataArray = [];

  newClipNamesArray.forEach(file => {
    dataArray.push(JSON.parse(fs.readFileSync(clipsPath + file)));
  });

  return dataArray;
}

function getLatestXClips( x ) {
  var fileArray = fs.readdirSync(clipsPath).reverse(); // newest first
  var namesArray = fileArray.slice(0, x);
  var dataArray = [];
  
  namesArray.forEach(file => {
    dataArray.push(JSON.parse(fs.readFileSync(clipsPath + file)));
  });
  return dataArray;
}

function getLatestClipTime( ) {
  return fs.readdirSync(clipsPath).pop().split(".json")[0];
}

// Does all the API interaction and updates the cache
function go( ) {
  var accessToken = retreiveAppAccessToken();
  var credentials = retreiveAppCredentials();
  if(checkAccessTokenExpired(accessToken)) {
    console.log("token refreshing in progress");
    fetchAppAccessToken(credentials["appId"], credentials["secret"]); // save is called from here

    // keep trying until new token is written and recieved
    var newAccessToken = accessToken;
    while(newAccessToken == accessToken) {
      newAccessToken = retreiveAppAccessToken();
    }
    accessToken = newAccessToken;
    console.log("token refreshed");
  }

  fetchClips(credentials["appId"], accessToken["token_string"]);
}

exports.getLatestClipTime = function ( ) { return getLatestClipTime(); }
exports.go = function( ) {return go();}
exports.getLatestXClips = function ( x ) { return getLatestXClips(x); }
exports.checkForNewClips = function ( since ) { return checkForNewClips(since); }

