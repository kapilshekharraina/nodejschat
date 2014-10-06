var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');


http.listen(process.env.PORT, function(){
  console.log('listening on '+process.env.PORT);
}); 

app.get('/', function(req, res){
  res.sendfile('index.html');
});
app.use(express.static(path.join(__dirname, 'public')));

console.log("STARTING @ "+process.env.PORT);
var roomUsers = {};


io.sockets.on('connection', function (socket) {
	
	
	
	socket.on('clientMessage', function(content) {

		console.log("serverMessage","You said :"+content);
		socket.emit("serverMessage","You :"+content);
		var username = socket['username'] ;
		//socket.prototype.get('username', function(err, username) {
			if (! username) {
				username = socket.id;
			}
			var room = socket.rooms[0];
			socket.broadcast.to(room).emit('serverMessage', username + ' : ' +content);
		//});
		

	});

	socket.on('login',function(content){

		var loginObject = 	JSON.parse(content)
		socket['username'] = loginObject.username;
		var room = loginObject.room;
		var oldRoom = socket.rooms[0];
		console.log("user = "+socket['username'] + "| Old Room ="+oldRoom +"|New Room "+room);
		if(oldRoom)
		{
			socket.leave(oldRoom,function(err){
				if(err){throw err;}
				socket.emit('serverMessage',"You have left : "+oldRoom);
				socket.broadcast.to(oldRoom).emit("serverMessage",socket['username']+" left");
			});
		}
		
		socket.join(room,function(err){
			socket.emit('serverMessage',"You have joined : "+room);
		});
		/*socket.prototype.set('username',content,function(err){
			throw err;
		});*/
		socket.emit('serverMessage',"You are now ready to chat as : "+socket['username'] +" in room :"+room);
		socket.broadcast.to(room).emit("serverMessage",socket['username']+" joined");
		// Update Room List
		var userObj = {id:socket.id+"-"+loginObject.username,name:loginObject.username};
		var oldRoomUserList = roomUsers[oldRoom];
		var newRoomUserList = roomUsers[room];
		//Push user into new Group
		if(newRoomUserList == undefined)
			newRoomUserList = new Array();

		newRoomUserList.push(userObj);

		var oldRoomUserListFiltered = [];
		if(oldRoomUserList == undefined)
		{
			oldRoomUserList = new Array();
		}else{
		// Remove User from old Group. use indexes ?
			oldRoomUserListFiltered = oldRoomUserList.filter(function (el) {
                        return (el.id !== userObj.id ) && (el.username !== userObj.name );
                    });
		}
		roomUsers[oldRoom] = oldRoomUserListFiltered;
		roomUsers[room] = newRoomUserList;

		// Event to notify all the oldRoom sockets to delete this user
		console.log("Emitting serverMessageuserLeft \n"+userObj);
		socket.broadcast.to(oldRoom).emit("serverMessageuserLeft",userObj);
		// Event to notify all the new room sockets to add this user
		console.log("Emitting serverMessageuserJoined \n"+userObj);
		socket.broadcast.to(room).emit("serverMessageuserJoined",userObj);
		//Event to send the users in new room to current socket to refresh the entire list
		console.log("Emitting serverMessageroomUsers to room :"+room);
		console.log(newRoomUserList);
		socket.emit("serverMessageroomUsers",newRoomUserList);
	});
	socket.on('disconnect',function(){
		
		var username = socket['username'] ;
		var room = socket.rooms[0];
		socket.broadcast.to(socket.rooms[0]).emit("serverMessage",username+" left");

		var userObj = {id:socket.id+"-"+username,name:username};

		
		console.log("Emitting serverMessageuserLeft \n"+userObj);
		socket.broadcast.to(room).emit("serverMessageuserLeft",userObj);

		// Remove the disconnected user from the list of users in room
		var roomUserList = roomUsers[room];
		if(roomUserList != undefined)
		{

	
			var userListFiltered = roomUserList.filter(function (el) {
	                        return (el.id !== userObj.id ) && (el.username !== userObj.name );
	                    });
			roomUsers[room] = userListFiltered;
		}
	});


	console.log("RECEIVED CONNECTION REQUEST. SENDING LOGIN EVENT");
	socket.emit('login');
	
});








