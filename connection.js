// Connection prototype
// --------------------
function Connection(a, b, type, strength) {
	this.a = a;	// Device A
	this.b = b; // Device B
	this.type = type;
	this.strength = strength;
	this.idealLength = 150;

	this.a.connections.push(this)
	this.b.connections.push(this)

	//this.shape = "bezier"; // "bezier"
	this.shape = Connection.shapes[current_connection_style % Connection.shapes.length]

	this.addToDom();
}

Connection.shapes = ["bezier", "straight", "90s", "rounded", "invisible"];

Connection.prototype = {
	addToDom: function() {
		// Create the DOM elements needed to draw this connection
		if(this.type == "wired" || this.type == "wireless") {
			//this.el = $("<line x1='0' y1='0' x2='100' y2='100' class='connector' />");
			var svg = $("#svg_container").svg('get');
			var x1 = this.a.anchor.left;
			var y1 = this.a.anchor.top;
			var x2 = this.b.anchor.left;
			var y2 = this.b.anchor.top;

			if(this.shape == "straight") {
				this.el = $(svg.line(x1, y1, x2, y2));
			}
			else if(this.shape == "bezier") {
				var p = svg.createPath();
				var dY = (y2 - y1) * .7;
				p.move(x1, y1).curveC(x1, y1 + dY, x2, y2 - dY, x2, y2);
				this.el = $(svg.path(p));
			}
			else if(this.shape == "90s") {
				var p = svg.createPath();
				var midY = (y2 - y1) / 2 + y1;
				p.move(x1, y1).line(x1, midY).line(x2, midY).line(x2,y2);
				this.el = $(svg.path(p));
			}
			else if(this.shape == "rounded") {
				var r = Math.min(20, Math.abs(x2-x1)/2);
				r = Math.min(r,Math.abs(y2-y1)/2);		// Make sure there's room to draw an arc
				var rx = r * (x2 > x1 ? 1 : -1);	// Radius
				var ry = r * (y2 > y1 ? 1 : -1);	// Radius
				var p = svg.createPath();
				var midY = (y2 - y1) / 2 + y1;
				var flip = ( x2>x1 != y2 < y1 ) ? true : false;	// Simulated XOR to the rescue
				p.move(x1, y1).line(x1, midY - ry).
							   arc(rx,ry,0, 0,!flip, x1+rx, midY).
							   line(x2-rx,midY).
							   arc(rx,ry,0, 0,flip, x2, midY+ry).
							   line(x2,y2);
				this.el = $(svg.path(p));
			}
			else if(this.shape == "invisible") {
				// for Level 2 of grid layout, dont show any wires.
			}
			this.el.addClass("connector");

			if(this.type == "wireless") this.el.addClass("wireless");
		}
	},
	changeShape: function(newshape) {
		if(newshape == this.shape) return;

		this.shape = newshape;

		// Remove and re-build
		var d = this.el.css('display');
		// console.log(d);
		this.el.remove();
		this.addToDom();
		this.el.css('display', d);
	},
	getLength: function() {
		// Returns length of element as drawn
		return this.a.distanceTo(this.b);
	},
	getPhysicsLength: function() {
		// Returns length of connector as modelled by the physics engine
		var v = this.getPhysicsVector();
		return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
	},
	getPhysicsUnitVector: function() {
		var l = Math.max(this.getPhysicsLength(), 0.001);
		var v = this.getPhysicsVector();
		return [v[0]/l, v[1]/l];
	},
	getPhysicsVector: function() {
		return [(this.b.target[0] - this.a.target[0]), (this.b.target[1] - this.a.target[1])];
	},
	update: function() {
		// Update enpoints
		var x1 = this.a.anchor.left;
		var y1 = this.a.anchor.top;
		var x2 = this.b.anchor.left;
		var y2 = this.b.anchor.top;

		var svg = $("#svg_container").svg('get');

		if(this.shape == "straight") {
			this.el.attr("x1", x1);
			this.el.attr("y1", y1);
			this.el.attr("x2", x2);
			this.el.attr("y2", y2);
		}
		else if(this.shape == "bezier") {
			// Build path manually
			var dY = (y2 - y1) * .7;
			this.el.attr("d", "M" + x1 + "," + y1 +
						      "C" + x1 + "," + (y1 + dY) + " " +
						            x2 + "," + (y2 - dY) + " " +
						            x2 + "," + y2); 
		}
		else if(this.shape == "90s") {
			var midY = (y2 - y1) / 2 + y1;
			this.el.attr("d",  "M" + x1 + "," + y1 +
							   "L" + x1 + "," + midY + " " +
							   "L" + x2 + "," + midY + " " +
							   "L" + x2 + "," + y2);
		}
		else if(this.shape == "rounded") {
			var r = Math.min(20, Math.abs(x2-x1)/2);
			r = Math.min(r,Math.abs(y2-y1)/2);		// Make sure there's room to draw an arc
			var rx = r * (x2 > x1 ? 1 : -1);	// Radius
			var ry = r * (y2 > y1 ? 1 : -1);	// Radius
			var p = svg.createPath();
			var midY = (y2 - y1) / 2 + y1;
			var flip = ( x2>x1 != y2 < y1 ) ? true : false;	// Simulated XOR to the rescue
			this.el.attr("d",  "M" + x1 + "," + y1 +
							   "L" + x1 + "," + (midY-ry) + " " +
							   "A" + rx + "," + ry + " 0 0," + (flip ? 0 : 1) + " " + (x1+rx) + "," + midY + " " +
							   "L" + (x2-rx) + "," + (midY) + " " +
							   "A" + rx + "," + ry + " 0 0," + (flip ? 1 : 0) + " " + (x2) + "," + (midY+ry) + " " +
							   "L" + x2 + "," + y2);

			//A 20,20 0 0,0 215,215
		}

		if(this.a.el.is(":visible") && this.b.el.is(":visible")) {
			this.el.show();
		}
		else {
			this.el.hide();
		}
	},
	die: function() {
		this.el.remove();
		// Remove references from devices
		var i = this.a.connections.indexOf(this);
		if(i >= 0)
			this.a.connections.splice(i, 1);
		i = this.a.connections.indexOf(this);
		if(i >= 0)
			this.b.connections.splice(i, 1);
	}

}
