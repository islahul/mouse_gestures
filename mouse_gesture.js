//a visualiser for the gesturing
var canvas = document.getElementById('mouseDirectionViewer');
var ctx = canvas.getContext('2d');
ctx.fillStyle = "rgb(200,200,200)";
ctx.fillRect(0, 0, 100, 100);

function draw(x,y){
	ctx.fillRect(0,0,100,100);
	ctx.beginPath();
	ctx.moveTo( 50, 50 );
	ctx.lineTo( 50 + x/6, 50 + y/6 );
	ctx.stroke();
	ctx.closePath();
}

jGuesture = $('.gesture');
jDirection = $('.direction');


MouseGesture = function( initObject ) {
	this.containerEl = initObject.containerEl || $('.mouseGestureSpace');
	this.skipPixels = initObject.skipPixels || 6;
	this.historySensitivity = initObject.historySensitivity || 30; //number of states to detect gesture from 
	this.directionTimeSensitivity = initObject.gestureTimeSensitivity || 500;
	this.gestureTimeSensitivity = initObject.gestureTimeSensitivity || 1000;
	this.motionSensitivity = initObject.motionSensitivity || 5;
	
	this.historyBuffer = new Array();
	this.directionBuffer = new Array();
	this.gestureRunning = false;
	this.directionRunning = false;
	this.previousMouseState = [ 0, 0 ];

	this.attachMouseEvent();
}

jQuery.extend( MouseGesture.prototype, {
	//list of gestures can be appended by the user
	gestureDef: {
		"l": "left",
		"r": "right",
		"d": "down",
		"u": "up",
		"u-d": "lightSaber",
		"d-u": "lightSaber",
		"ur-dl": "ninjaSlash",
		"dl-ur": "ninjaSlash",
		"ul-dr": "ninjaSlash",
		"dr-ul": "ninjaSlash",
		"r-d-l-u": "spiral",
		"d-l-u-r": "spiral",
		"l-u-r-d": "spiral"
		},

	//mouse move event
	attachMouseEvent: function() {
		var self = this;
		self.containerEl.bind( 'mousemove', function( e ) {
			//if mouse motion crosses threshold
			if( ( Math.abs(self.previousMouseState[0] - e.pageX) > self.skipPixels ) || ( Math.abs(self.previousMouseState[1] - e.pageY) > self.skipPixels ) ) {
				self.resolveMouseMotion( e.pageX, e.pageY );
				//set previous mouse state for future reference
				self.previousMouseState = [ e.pageX, e.pageY ];
			}
		});
	},

	//populates Buffer
	resolveMouseMotion: function( mouseX, mouseY ) {
		if( this.historyBuffer.length < this.historySensitivity ) {
			this.historyBuffer.push( [ mouseX, mouseY ] );
			this.refreshBuffer();
		}
		else {
			this.refreshBuffer();
		}
	},

	//see if there is a direction in the buffer or time it out to refresh it
	refreshBuffer: function() {
		var self = this;
		if( this.directionRunning == false ){
			this.directionRunning = true;
			//timeOut buffer to prevent slow gestures
			this.directionTimeout = setTimeout(function(){
				var direction = self.detectMotionFromBuffer();
				//if this direction is dissimilar to previous direction then only push it
				if( direction != "none" ) {
					if( direction != self.directionBuffer[ self.directionBuffer.length-1 ] ) {
						self.directionBuffer.push( direction );
					}
				}
				//restart the buffer
				self.historyBuffer = new Array();		
				self.directionRunning = false;
				self.refreshMe();
			}, self.directionTimeSensitivity );
		}
		else if( this.historyBuffer.length >= this.historySensitivity ) {
			var direction = self.detectMotionFromBuffer();
				//if this direction is dissimilar and is not "none" to previous direction then only push it
				if( direction != "none" ) {
					if( direction != self.directionBuffer[ self.directionBuffer.length-1 ] ) {
						self.directionBuffer.push( direction );
					}
				}
					
				//restart the buffer
				self.historyBuffer = new Array();		
				self.directionRunning = false;
				this.refreshMe();
				//prevent the timeout function from refreshing the history buffer
				clearTimeout(self.directionTimeout);
		}
	},
	
	///historyBuffer is a buffer array containing the cursor positions
	detectMotionFromBuffer: function() {
		var historyBuffer = this.historyBuffer,
			vectorX = 0,
			vectorY = 0,
			direction = "",
			i, iL;
		//create vector from history buffer
		for( i = 0, iL = historyBuffer.length; i < (iL-1); i++ ) {
			vectorX += historyBuffer[i+1][0] - historyBuffer[i][0];
			vectorY += historyBuffer[i+1][1] - historyBuffer[i][1];
		}
		//see if there is significant motion
		if( Math.abs(vectorX) > this.skipPixels*this.motionSensitivity || Math.abs(vectorY) > this.skipPixels*this.motionSensitivity ) {	
			draw(vectorX,vectorY);
			//detect diagonal motion
			if( Math.abs(vectorY/vectorX) > 0.8 && Math.abs(vectorY/vectorX) < 4) {

				// Assign top bottom left or right
				if(vectorY > 0) {
					direction += "d"; //down because positive pixel y direction is actually down
				}
				else {
					direction += "u"; //up 
				}

				if( vectorX > 0 ) {
					direction += "r";
				}
				else {
					direction += "l";
				}
			}
			//or if its just single direction
			else {
				if( ( Math.abs( vectorY ) > Math.abs( vectorX ) ) && vectorY > 0 ) {
					direction = "d"; //down because positive pixel y direction is actually down
				}
				else if( ( Math.abs( vectorY ) > Math.abs( vectorX )) && vectorY < 0 ) {
					direction = "u"; //up 
				}
				else if( vectorX > 0 ) {
					direction = "r";
				}
				else {
					direction = "l";
				}
			}
			jDirection.html(direction);
		}
		else {
			direction = "none";
		}


		return direction;
	},

	detectGesture: function() {
		var gesture = "no-gesture",
			gestureDef = this.gestureDef,
			inputGesture = ""+this.directionBuffer[0],
			i, iL, lds;
		//convert current directionBuffer into a gesture string
		for( i=1,iL = this.directionBuffer.length; i<iL; i++ ) {
			inputGesture += "-"+this.directionBuffer[ i ];
		}
		//see if the string closest to input gesture in the original string
		for(gestureString in gestureDef) {
			//find levenshtein distance between gesture definition and input gesture string
			lds = LD( gestureString, inputGesture );
			if( (lds/gestureString.length) < 0.4) {
				gesture = gestureDef[ gestureString ];
				break;
			}
		};
		this.directionBuffer = new Array();
		jGuesture.html(gesture);
		return gesture;
	},

	//sets a time window for a gesture to happen
	refreshMe: function() {
		var self = this;
		if( this.gestureRunning == false ){
			this.gestureRunning = true;
			//timeOut buffer to prevent slow gestures
			this.gestureTimeout = setTimeout( function() {
				var gesture = self.detectGesture();
				self.gestureRunning = false;
			}, self.gestureTimeSensitivity );
		}
	}
});

/*var slappedObject = function( initObject ) {
	this.jEl = initObject.jEl || $('.slapFace');
	this.spriteHeight = initObject.spriteHeight || 70;
	this.spriteWidth = initObject.spriteWidth || 75;
	this.spriteFrames = initObject.spriteFrames || 10;
	this.currentFrame = initObject.currentFrame || [0, 0];
}

jQuery.extend(slappedObject.prototype, {

	_animateSprite: function( spritePosition ) {
	    var newBgPos = "-"+( spritePosition[1] )*self.spriteWidth + "px -"+ spritePosition[0]*self.spriteHeight + "px";
	    this.jEl.css( "background-position", newBgPos );
	},

	//resolves the type of animation called into the row of sprite and column of sprite
	animate: function( animType, relativePosition ){
		//relative position of the object is evaluated in percentage and converted to column of the sprite
		var spriteColumn = Math.floor((relativePosition-0.1)/100 * spriteFrames);

		switch( animType ){
			case 'rightSlap':
				break;

			case 'leftSlap':
				break;

			case 'upperCut':
				break;

			case 'headBang':
				break;	
		}
	}
});
*/


