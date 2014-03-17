var layout = "map"; // "timeline" or "map"

var physics;
var width, height;

var filter_rect = true;

var MIN_LAT = 30.434841;
var MAX_LAT = 30.445866;
var MIN_LONG = -84.286213;
var MAX_LONG = -84.285031;


/*
var MIN_LONG = 30.431906;
var MAX_LONG = 30.436527;
var MIN_LAT = -84.328231;
var MAX_LAT = -84.327320;
*/
//<coordinates>-84.328412,30.431906,15.876652</coordinates>


$(document).ready(function() {

  width = $(window).width() * (layout == "map" ? 2 : 1);  // 8 for horizontal
  height = $(window).height() * (layout == "map" ? 16 : 1); // 3 for vertical
  $("#container").width(width);
  $("#container").height(height);


  $("#svg_container").svg();  // Initialize the SVG canvas
  var svg = $("#svg_container").svg('get');
  $("#svg_container").width(width);
  $("#svg_container").height(height);
  $("#svg_container > SVG").width(width);
  $("#svg_container > SVG").height(height);
  //$("#svg_container").hide();

  var log = $.parseXML($("#fiber_loop_2").html());
  //var log = $.parseXML($("#logfile2").html());
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
  	

    // Do some filtering
    var ignored_ssids = [];
    //var ignored_ssids = ["City of Minneapolis Public WiFi", "USI Wireless", "(null)"];
    if($.inArray(SSID, ignored_ssids) >= 0 || /usiw_secure(.*)/.test(SSID)) return;
    if(filter_rect && (coordinates[0] < MIN_LAT || coordinates[0] > MAX_LAT || coordinates[1] > MAX_LONG || coordinates[1] < MIN_LONG)) return;

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

/*
  // SORT THE NETWORKS by time
  networks.sort(function(a,b) {
  																		 	// Sort by...
  	//return (((a.seen_first+a.seen_last)) - ((b.seen_first+b.seen_last)));	// Average time
  	return a.seen_first - b.seen_first;									// First seen
  	//return a.seen_last - b.seen_last;										// Last seen
  });
*/

  // SORT THE NETWORKS by strength
  networks.sort(function(a,b) {
    return a.strength - b.strength;
  });

  var start_time = networks[0].seen_first;
  var end_time = networks[networks.length-1].seen_first;
  var timespan = end_time - start_time;

  // Create a DIV for each network label
  // -----------------------------------
  var networkElements = [];
  //var max_font_size = 600 / networks.length * 25;
  var circles_group = svg.group();
  var max_font_size = 96;
  $.each(networks, function(idx) {
    if(layout == "map") {
      var el = [];
      var x = Math.map(this.coordinates[1], longs_min, longs_max, width * .3, width * .7);
      var y = Math.map(this.coordinates[0], lats_min, lats_max, height * .7, height * .3);
      
      var translate_group = svg.group({transform: 'translate(' + x + ',' + y + ')'});
      var rotate_group = svg.group(translate_group, {transform: 'rotate(' + Math.randomRange(-180,180) +')'});
      //var distance_group = svg.group(rotate_group, {transform: 'translate(' + Math.randomRange(0,100) + ',0)'});
      var distance_group = svg.group(rotate_group);
      $(translate_group).addClass("network " + this.security);

      var font_size = Math.map(this.strength, strength_min, strength_max, 5, max_font_size);
      var label = svg.text(distance_group, font_size/8,0, this.SSID);
      $(label).css("font-size", font_size + "px");
      var label_w = $(label).width();
      var label_h = $(label).height();
      
      var rect = svg.rect(distance_group, 0,-label_h/2, label_w + font_size/4, label_h);
      svg.remove(label);
      //label = svg.add(rotate_group, label);
      label = svg.text(distance_group, font_size/8,0, this.SSID);
      $(label).css("font-size", font_size + "px");
      $(label).attr("y", label_h*.30);
      //$(rect).addClass("network " + this.security);

    	
    	var circle = $(svg.circle(circles_group, x, y, Math.map(this.strength, strength_min, strength_max, 1,max_font_size*1.5)));
    	circle.addClass('network_circle');
    	circle.addClass(this.security);


    	var connector = $(svg.line(circles_group, x, y, x, y));
    	connector.addClass('network_circle');
    	connector.addClass(this.security);
    	el.connector = connector;
    	connector.circle = circle;

      el.translate_group = $(translate_group);
      el.rotate_group = $(rotate_group);
      el.distance_group = $(distance_group);
      el.label = $(label);
      el.rect = $(rect);
      el.x = x;
      el.y = y;

    	networkElements.push(el);
      
    }
    else {
      //networkElements.push(el);

      el.css("position", "absolute");
      el.offset({top: height - Math.randomRange(0,height), left: 0});
      el.css("width", el.width()+3);
      el.css("opacity", 0);
      el.transition({rotate: -45, x: el.width()/2, left: Math.map(this.seen_first, start_time, end_time, 0, width*4), opacity: 1, delay: idx * 10}, 100);

    }
  });

  if(layout == "map")
    setupPhysics(networkElements);

  // Draw SVG path
  //var pathElement = $(svg.polyline(getSmoothedPolyline(path, .1)));	// second parameter is curve tightness
  //pathElement.addClass('route');

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
    physics.setDrag(0.5);
  	physics.setWorldBounds(new Rect(0, 0, width, height));
    //physics.addBehavior(new GravityBehavior(new Vec2D(0, 0.15)));

  	// Create particles for each DIV with springs connecting to original location
  	$.each(elements, function(idx, el) {
  		var center = [el.x, el.y];
      var el_width = el.rect.attr("width");
      var el_height = el.rect.attr("height");
  		var baseParticle = new VerletParticle2D(new Vec2D(center[0], center[1]));
  		baseParticle.lock();
  		//var elParticle = new VerletParticle2D(new Vec2D(center[0] + Math.randomRange(-el_height,el_height), center[1] + Math.randomRange(-el_width,el_width)));
      var elParticle = new VerletParticle2D(new Vec2D(center[0] + Math.randomRange(-1,1), center[1] + Math.randomRange(-1,1)));
  		elParticle.el = el;
  		elParticle.base = baseParticle;
  		//elParticle.setWeight(1/Math.sqrt(parseInt(el.css("font-size"))));
  		physics.addParticle(baseParticle);
  		physics.addParticle(elParticle);


  		// Hold close to base with a spring
  		var spring = new VerletSpring2D(baseParticle, elParticle, el_width/2, .001);
      physics.addSpring(spring);
  		// And repell each other
      physics.addBehavior(new AttractionBehavior(elParticle, el_width, -20, 0.01));
      physics.addBehavior(new AttractionBehavior(baseParticle, el_width, -20, 0.01));

  	});
  	
  	physics.cycles = 0;
  	//physics.updateInterval = window.setInterval(updatePhysics, 1000.0/24.0);
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
    var stopPhysics = false;
    for(var i=0; i<10; i++) {
  		physics.update();
    	physics.cycles++;
    	if(physics.cycles > 1000) stopPhysics = true;
    }
    var x_axis = new Vec2D(0,1);
    $.each(physics.particles, function(idx, p){ 
    	if(p.el) {
    		
        p.el.translate_group.attr("transform", 'translate(' + p.x + ',' + p.y + ')');

    		// ROTATE AND RADIATE
    		// Calculate angle to base particle
    		
    		var offset = p.sub(p.base);
    		var mag = offset.magnitude();
    		
        var angle = Math.atan2(offset.y, offset.x) * 180 / Math.PI;
        //var angle_quant = Math.round(angle/45.0) * 45;  // Quantize angle
        //var angle_quant = Math.round(angle/60.0) * 60;  // Quantize angle
        var angle_quant = angle;

        var dist;
        if((angle < 90 || angle < -270) && (angle > -90 || angle > 270)) {
          //dist = p.el.width() / 2 + mag;
          dist = mag;
          ///p.el.transition({rotate: angle_quant}, 0);
          p.el.rotate_group.attr("transform", 'rotate(' + angle_quant + ')');
          p.el.distance_group.attr("transform", 'translate(0,0)');
          //p.el.transition({rotate: angle_quant, x: dist}, 0);
        }
        else {
          angle += 180;
          angle_quant += 180;
          //dist = -mag - p.el.width() / 2;
          dist = -mag;
          //p.el.transition({rotate: angle_quant}, 0);  
           p.el.rotate_group.attr("transform", 'rotate(' + angle_quant + ')');
           p.el.distance_group.attr("transform", 'translate(' + (-p.el.rect.attr("width")) + ',' + 0 + ')');
          //p.el.transition({rotate: angle_quant, x: -dist}, 0);
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
    //if(!stopPhysics) window.setTimeout(updatePhysics, 1000.0/24);
    if(!stopPhysics) window.setTimeout(updatePhysics, 1);
    else {
      // Output SVG
      var svg = $("#svg_container").svg('get');
      var source = $("<div />");
      source.text(svg.toSVG());
      $("#container").append(source);
    }
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
