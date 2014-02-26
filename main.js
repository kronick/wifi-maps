var physics;
var width, height;

$(document).ready(function() {

  width = $(window).width() * 4;
  height = $(window).height() * 4;
  $("#container").width(width);
  $("#container").height(height);


  $("#svg_container").svg();  // Initialize the SVG canvas
  var svg = $("#svg_container").svg('get');
  $("#svg_container").width(width);
  $("#svg_container").height(height);
  $("#svg_container > SVG").width(width);
  $("#svg_container > SVG").height(height);
  //$("#svg_container").hide();

  var log = $.parseXML($("#logfile3").html());
  var networkTags = $(log).find("Placemark");

  var networks = [];
  var strengths = [];
  var lats = [];
  var longs = [];

  networkTags.each(function() {
  	var $this = $(this);
  	var SSID = $this.find("name").text();
  	var description = $this.find("description").text();
  	var strength = /MaxRssi: (.*?)<br>/.exec(description)[1];
  	var channel = /Channel: (.*?)<br>/.exec(description)[1];
  	var coords = /(.*?),(.*?),(.*)/.exec($this.find("coordinates").text());
  	var coordinates = [coords[2], coords[1], coords[3]];
  	var security = /Security: (.*?)<br>/.exec(description)[1];
  	var type = /Type: (.*?)<br>/.exec(description)[1];
  	var seen_first = new Date(/FirstSeen: (.*?)<br>/.exec(description)[1]).getTime();
  	var seen_last = new Date(/LastSeen: (.*)/.exec(description)[1]).getTime();
  	
  	// For range calculation
  	strengths.push(parseInt(strength));
  	lats.push(parseFloat(coordinates[0]));
  	longs.push(parseFloat(coordinates[1]));

  	networks.push({
  		"SSID": SSID,
  		"strength": strength,
  		"coordinates": coordinates,
  		"type": type,
  		"security": security,
  		"channel": channel,
  		"seen_first": seen_first,
  		"seen_last": seen_last
  	});
  });

  var strength_min = Array.min(strengths);
  var strength_max = Array.max(strengths);
  var lats_min = Array.min(lats);
  var lats_max = Array.max(lats);
  var longs_min = Array.min(longs);
  var longs_max = Array.max(longs);

  var path = [];

  // SORT THE NETWORKS by time
  networks.sort(function(a,b) {
  																		 	// Sort by...
  	//return (((a.seen_first+a.seen_last)) - ((b.seen_first+b.seen_last)));	// Average time
  	return a.seen_first - b.seen_first;									// First seen
  	//return a.seen_last - b.seen_last;										// Last seen
  });

  // Create a DIV for each network label
  // -----------------------------------
  var ignored_ssids = ["City of Minneapolis Public WiFi", "USI Wireless", "(null)"];
  var networkElements = [];
  var max_font_size = 600 / networks.length * 25;
  $.each(networks, function(idx) {
  	if($.inArray(this.SSID, ignored_ssids) >= 0 || /usiw_secure(.*)/.test(this.SSID)) return;
  	var el = $("<div class='network'>" + this.SSID + "</div>");

  	//el.css("font-size", Math.map(this.strength, strength_min, strength_max, 1,max_font_size) + "em");
  	el.css("font-size", Math.map(this.strength, strength_min, strength_max, 1, 100) + "%");
  	el.addClass(this.security);
  	//el.css("background", "rgba(0,0,0," + Math.map(this.strength, strength_min, strength_max, 0,1) + ")");
  	//el.css("background", "rgba(0,0,0,.5)");
  	el.css("z-index", Math.floor(Math.map(this.strength, strength_min, strength_max, 0,10)));
  	

  	//var el = $("<div class='network'>o</div>");
  	
  	$("#container").append(el);

  	var t = Math.map(this.coordinates[0], lats_min, lats_max, height * .8, height * .2);
  	var l = Math.map(this.coordinates[1], longs_min, longs_max, width * .2, width * .8);
  	el.offset({
  		top: t - el.height() / 2.0,
  		left: l - el.width() / 2.0
  	});

  	// Make an array of points for SVG polyline
  	path.push([l, t]);
  	//l -= el.width() / 2;
  	//t -= el.height() / 2;

  	var circle = $(svg.circle(l, t, Math.map(this.strength, strength_min, strength_max, 1,max_font_size*5)));
  	circle.addClass('network_circle');
  	circle.addClass(this.security);


  	var connector = $(svg.line(l, t, l, t));
  	connector.addClass('network_circle');
  	connector.addClass(this.security);
  	el.connector = connector;
  	connector.circle = circle;

  	networkElements.push(el);
  });

  setupPhysics(networkElements);

  // Draw SVG path
  var pathElement = $(svg.polyline(getSmoothedPolyline(path, .1)));	// second parameter is curve tightness
  pathElement.addClass('route');

});

function setupPhysics(elements) {
    var  VerletPhysics2D = toxi.physics2d.VerletPhysics2D,
         VerletParticle2D = toxi.physics2d.VerletParticle2D,
         VerletSpring2D = toxi.physics2d.VerletSpring2D,
         AttractionBehavior = toxi.physics2d.behaviors.AttractionBehavior,
         GravityBehavior = toxi.physics2d.behaviors.GravityBehavior,
         Vec2D = toxi.geom.Vec2D,
         Rect = toxi.geom.Rect;	
    
    // Initialize physics world
    physics = new VerletPhysics2D();
    physics.setDrag(0.05);
  	physics.setWorldBounds(new Rect(0, 0, width, height));

  	// Create particles for each DIV with springs connecting to original location
  	$.each(elements, function(idx, el) {
  		var center = [el.offset().left + el.width()/2, el.offset().top + el.height()/2];
  		var baseParticle = new VerletParticle2D(new Vec2D(center[0], center[1]));
  		baseParticle.lock();
  		var elParticle = new VerletParticle2D(new Vec2D(center[0] + Math.randomRange(-.5,.5), center[1] + Math.randomRange(-.5,.5)));
  		elParticle.el = el;
  		elParticle.base = baseParticle;
  		elParticle.setWeight(1/parseInt(el.css("font-size")));
  		physics.addParticle(baseParticle);
  		physics.addParticle(elParticle);

  		// Hold close to base with a spring
  		var spring = new VerletSpring2D(baseParticle, elParticle, 0, 10);
  		// And repell each other
  		physics.addBehavior(new AttractionBehavior(elParticle, 20, -2, 0.01));

  		//console.log(center);
  	});
  	
  	physics.cycles = 0;
  	//physics.updateInterval = window.setInterval(updatePhysics, 1000.0/10.0);
  	updatePhysics();
}

function updatePhysics(elements) {
    var  VerletPhysics2D = toxi.physics2d.VerletPhysics2D,
         VerletParticle2D = toxi.physics2d.VerletParticle2D,
         AttractionBehavior = toxi.physics2d.behaviors.AttractionBehavior,
         GravityBehavior = toxi.physics2d.behaviors.GravityBehavior,
         Vec2D = toxi.geom.Vec2D,
         Rect = toxi.geom.Rect;		

    //console.log("aSDF");
    for(var i=0; i<100; i++) {
  		physics.update();
    	physics.cycles++;
    	if(physics.cycles > 100) window.clearInterval(physics.updateInterval);
    }
    var x_axis = new Vec2D(0,1);
    $.each(physics.particles, function(idx, p){ 
    	if(p.el) {
    		// STAY LEVEL
    		var offset = p.sub(p.base);
    		//p.el.transition({left: p.x - p.el.width()/2, top: p.y - p.el.height()/2}, 1000);
    		////p.el.offset({left: p.x - p.el.width()/2, top: p.y - p.el.height()/2});


    		// ROTATE AND RADIATE
    		// Calculate angle to base particle
    		
    		var offset = p.sub(p.base);
    		var mag = offset.magnitude();
    		var angle = Math.atan2(offset.y, offset.x) * 180 / Math.PI;

    		angle = Math.round(angle/45.0) * 45;	// Quantize angle

    		var dist;
    		if((angle < 90 || angle < -270) && (angle > -90 || angle > 270)) {
    			dist = p.el.width() / 2 + mag;
    			p.el.transition({rotate: angle, x:dist}, 1000);

    		}
    		else {
    			angle += 180;
    			dist = -mag - p.el.width() / 2;
    			p.el.transition({rotate: angle, x:dist}, 1000);	
    		}
    		
    		// Update connector
    		var c = p.el.connector;
    		var r = c.circle.attr("r"); // circle radius
    		if(dist < 0) r *= -1;
    		//c.attr("x1", Math.cos(angle * Math.PI / 180.0) * r + p.base.x);
    		//c.attr("y1", Math.sin(angle * Math.PI / 180.0) * r + p.base.y);
    		c.attr("x1", p.base.x);
    		c.attr("y1", p.base.y);
    		c.attr("x2", Math.cos(angle * Math.PI / 180.0) * dist + p.base.x);
    		c.attr("y2", Math.sin(angle * Math.PI / 180.0) * dist + p.base.y);

    	}
    });
}

function getSmoothedPolyline(vertices, tightness) {
	spline = new toxi.geom.Spline2D();
	spline.setTightness(tightness);
	for(var i=0; i<vertices.length; i++) {
		spline.add(new toxi.geom.Vec2D(vertices[i][0], vertices[i][1]));
	}
	var vectors = spline.computeVertices(8);
	var out = [];
	for(var i=0; i<vectors.length; i++) {
		out.push([vectors[i].x, vectors[i].y]);
	}

	return out;
}

Array.max = function( array ){
    return Math.max.apply( Math, array );
};
 
Array.min = function( array ){
    return Math.min.apply( Math, array );
};

Math.map = function(x, a,b, c,d) {
	return ((x-a) / (b-a)) * (d-c) + c;
}

Math.randomRange = function(low, high) {
	return Math.random() * (high-low) + low;
}

Math.randomInt = function(low, high) {
	return Math.floor(Math.randomRange(low, high));
}