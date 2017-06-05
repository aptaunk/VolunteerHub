const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const db = admin.database();

exports.deleteUnverfiedAccounts = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    res.status(200).send("OK");
    db.ref("newUsers")
    .once('value')
    .then(function(users){
      users.forEach(function(u){
        admin.auth()
        .getUser(u.key)
        .then(function(user){
          if (!user.emailVerified){
            admin.auth().deleteUser(user.uid);
          }
        },function(error){
          console.log("Error: "+error);
        });
      });
      return admin.database().ref("newUsers")
      .remove();
    }).then(function(){
      console.log("Deleted Unverified Accounts");
    },function(error){
      console.log("Error: "+error);
    })
  });
});

function createVolunteer(event) {
  const user = event.data;
  return db.ref('volunteers/' + user.uid)
  .set({
    hours: 0
  });
}

function createNewUserList(event) {
  const user = event.data;
  return db.ref('newUsers/' + user.uid)
  .set(true);
}

exports.onCreatingNewUser = functions.auth.user().onCreate(event => {
  return createNewUserList(event)
  .then(function(){
    return createVolunteer(event)
  }).then(function(){
    console.log("Created New User");
  },function(error){
    console.log("Error: "+error);
  });
});

exports.onDeleteUser = functions.auth.user().onDelete(event => {
  return admin.database().ref("volunteers/"+event.data.uid)
  .remove()
  .then(function(){
    console.log("Deleted User");
  },function(error){
    console.log("Error: "+error);
  });
});

exports.updateTotalHours = functions.database.ref('volunteers/{vid}/opportunities/{opid}').onWrite(event => {
  if (event.data.exists() && event.data.previous.exists()) {
    return event.data.ref.parent.parent.child('hours')
    .once('value')
    .then(function(hrs){
      var currHours = hrs.val();
      var newHours = +event.data.val() - +event.data.previous.val();
      var totalHours = +currHours + +newHours;
      return hrs.ref.set(totalHours);
    }).then(function(){
      console.log("Hours updated");
    },function(error){
      console.log("Error: "+error);
    });
  }
});
