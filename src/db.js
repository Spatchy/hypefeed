const Mongo = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/';

var _db;

module.exports = {
    connect(callback) { 
        Mongo.connect(
            url, 
            { useUnifiedTopology: true }, 
            (err, client) => {
                _db = client.db('hypefeed');
                console.log('connection established');
                return callback(err);
            }   
        );
    },
    getDB(){
        return _db;
    }
}



