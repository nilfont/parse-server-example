// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
 var _ = require('underscore.js');
 
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("isMe", function(request, response) {
		var Profile = Parse.Object.extend("Profile");
		var query = new Parse.Query(Profile);

		
		query.equalTo("objectId", request.params.profileId);
		query.first().then(function(object){
			 console.log(object.attributes.user.id);
			 console.log(request.user.id);
			 if(object.attributes.user.id == request.user.id) response.success('Wellcome');
			 else response.error('Realy?');
		});	
});

Parse.Cloud.define("signupAsBasicUser", function(request, response) {
	var postParams = request.body;
	signupAsBasicUser(request.params.username, request.params.password, request.params.email).then(function(user) {
        response.success(user);
    }, function(error) {
        response.error(error);
    });
});

//return a promise fulfilled with a signed-up user who is added to the 'Basic User" role
//
function signupAsBasicUser(name, password, email) {
    var user = new Parse.User();
    user.set("username", name);
    user.set("password", password);
    user.set("email", email);
    return user.signUp().then(function() {
        var query = new Parse.Query(Parse.Role);
        query.equalTo("name", 'BasicUser');
        return query.find();
    }).then(function(roles) {
        if (roles.length < 1) return Parse.Promise.error("no such role");
        roles[0].getUsers().add(user);
        return roles[0].save();
    }).then(function() {
        return user;
    });
}


Parse.Cloud.afterSave("Like", function(request) {
	
	var like = {
        "__type": "Pointer",
        "className": "Like",
        "objectId": request.object.id,
    };

	var Post = Parse.Object.extend("Post");
	var post = new Post();
	post.set('id', request.object.attributes.postId.id);
	//console.log(post);
	Parse.Cloud.useMasterKey();
	post.addUnique("likes", like);
	post.save({ useMasterKey: true },{
	  success: function(post) {
	    // save succeeded
	  },
	  error: function(post, error) {
	    // inspect error
	  }
	});
});

Parse.Cloud.afterDelete("Like", function(request) {
	var like = {
	        "__type": "Pointer",
	        "className": "Like",
	        "objectId": request.object.id,
	    };

		var Post = Parse.Object.extend("Post");
		var post = new Post();
		post.set('id', request.object.attributes.postId.id);	 
		post.remove("likes", like);
		post.save(null,{
		  success: function(post) {
		    // save succeeded
		  },
		  error: function(post, error) {
		    // inspect error
		  }
		});
});


Parse.Cloud.afterSave("Comment", function(request) {
	
	var comment = {
        "__type": "Pointer",
        "className": "Comment",
        "objectId": request.object.id,
    };

	var Post = Parse.Object.extend("Post");
	var post = new Post();
	Parse.Cloud.useMasterKey();
	post.set('id', request.object.attributes.postId.id);	 
	post.addUnique("comments", comment);
	post.save(null,{
	  success: function(post) {
	    // save succeeded
	  },
	  error: function(post, error) {
	    // inspect error
	  }
	});
});

Parse.Cloud.afterDelete("Comment", function(request) {
	var like = {
	        "__type": "Pointer",
	        "className": "Comment",
	        "objectId": request.object.id,
	    };

		var Post = Parse.Object.extend("Post");
		var post = new Post();
		post.set('id', request.object.attributes.postId.id);	 
		post.remove("comments", like);
		post.save(null,{
		  success: function(post) {
		    // save succeeded
		  },
		  error: function(post, error) {
		    // inspect error
		  }
		});
});



Parse.Cloud.define("getTimeline", function(request, response) {
	var Timeline = Parse.Object.extend("Post");
	var query = new Parse.Query(Timeline);

	query.include("profile");
	return query.find(function(results) {
			var posts = [];
			var aLikes = [];
			
		  	//Fetch all postsIDs to search
		  	var postLikesIDs = [];
		  	var postCommentsIDs = [];
		  	var postIDsIndex = [];
		  	
		  	_.each(results, function(result, i) {	
		  		postLikesIDs.push({	"__type": "Pointer", "className": "Post", "objectId": result.id });
		  		postCommentsIDs.push({	"__type": "Pointer", "className": "Post", "objectId": result.id });
		  		postIDsIndex[result.id] = i;
		  	});

		  	var Likes = Parse.Object.extend("Like");
		  	var Comments = Parse.Object.extend("Comment");
		  	var queryLikes = new Parse.Query(Likes);
		  	var queryComments = new Parse.Query(Comments);	
		  	queryLikes.containedIn("postId", postLikesIDs);
		  	queryLikes.include('profileId');
		  	queryComments.containedIn("postId", postCommentsIDs);
		  	queryComments.include('profileId');
		  	
		  	var promiseLikes = queryLikes.find().then(function(likeResults) {
		  		_.each(likeResults, function(likes, i) {	
		  			var tmp = []; 
		  			
		  			if(typeof results[postIDsIndex[likes.attributes.postId.id]].attributes.likes === "undefined"){
		  				//console.log('like undefined');
		  					tmp.push(likes);
		  			}
		  			else{
		  				tmp = results[postIDsIndex[likes.attributes.postId.id]].attributes.likes;
		  				tmp.push(likes);
		  			}

		  			results[postIDsIndex[likes.attributes.postId.id]].attributes.likes = tmp;
			  	});
		  		return results;

			});
		  	
		  	var promiseComments = queryComments.find().then(function(commentResults) {
		  		//console.log(commentResults);
		  		_.each(commentResults, function(comments, i) {	
		  			var tmp = []; 
			  		//console.log(results);
		  			//console.log(results[postIDsIndex[comments.attributes.postId.id]].attributes.comments);
	  				//console.log(typeof results[postIDsIndex[comments.attributes.postId.id]].attributes.comments);
		  			/*if(typeof results[postIDsIndex[comments.attributes.postId.id]].attributes.comments === "undefined"){
		  				console.log('undefined');
		  					tmp.push(comments);
		  					
		  			}
		  			else{

		  				tmp = results[postIDsIndex[comments.attributes.postId.id]].attributes.comments;
		  				tmp.push(comments);
		  			}*/
	  				tmp.push(comments);

		  			results[postIDsIndex[comments.attributes.postId.id]].attributes.comments = tmp;
		  			
			  	});
		  		return results;
			});
		  	
		  	Parse.Promise.when([promiseLikes,promiseComments]).then(function(wait){
		  		response.success(results);
		  	});

		},
		function(error){
			response.error("ERROR in getTimeline");
		});	
	
	
});

/*Parse.Cloud.afterSave("Post", function(request) {	
	
	console.log(request.object.attributes.installationID);
	var query = new Parse.Query(Parse.Installation);
	//query.notEqualTo("installationId", request.object.attributes.installationID);
	query.equalTo('channels', 'NewPosts');
	console.log(query);

	Parse.Push.send({
	  where: query, // Set our Installation query
	  data: {
	    alert: request.object.attributes.text
	  }
	}, {
	  success: function() {
	    // Push was successful
	  },
	  error: function(error) {
	    // Handle error
	  }
	});
});*/

Parse.Cloud.define("publish", function(request, response) {
	//var Post = Parse.Object.extend("Post");
	//var post = new Post();
	var post = new Parse.Object("Post",request.params);

	
	
	post.save(null,{
	  success: function(requestpush) {
		  var query = new Parse.Query(Parse.Installation);
		  //query.notEqualTo("installationId", request.params.installationID);
		  query.equalTo('channels', 'NewPosts2');

			  
		  Parse.Push.send({
			  where: query, // Set our Installation query
			  data: {
			    alert: request.params.text
			  }
			}, {
			  success: function(post) {
			    // Push was successful
				
			  },
			  error: function(error) {

			  }
			});
		  response.success(post);
	  },
	  error: function(post, error) {
		  response.error("ERROR saving post");
	  }
	});
});

Parse.Cloud.define("push", function(request, response) {
	var query = new Parse.Query("Post");
	
	 query.get(request.params.objectId, {
	    success: function(post) {
	      post.increment("push");
	      var text = post.get("text");
	      post.save();
	      var queryPush = new Parse.Query(Parse.Installation);
		  //query.notEqualTo("installationId", post.installationID);
		  queryPush.equalTo('channels', 'NewPosts2');
		  console.log(text);
		  Parse.Push.send({
			  where: queryPush, // Set our Installation query
			  data: {
			    alert: text,
			  }
			}, {
			  success: function(post) {
				  response.success(request.params.objectId);
				
			  },
			  error: function(error) {

			  }
			});
	    },
	    error: function(error) {
	      console.error("Got an error " + error.code + " : " + error.message);
	    }
	 });
	  
});

