function runTinyPhysics() {
	// TUNING PARAMETERS
	// -------------------------------------------------------------------------------------------------------
	var SPRING_K = 0.2;		// Spring force constant
	var SPRING_REST = 150;	// Spring resting distance
	var REPULSION_K = 200;	// Repulsion force between nodes to keep things spaced out
	var BOUNDARY_K = 10; 	// Repulsion force to keep everything constrained to the screen
	var DAMPING = 0.5;		// Percent of velocity to retain between steps (higher numbers are bouncier)
	var STEPS = 500;		// Steps to run towards convergence. Higher numbers are slower but more stable.
	var GRID_K = 0.1;		// Force to pull things towards grid points
	var GRID_SIZE = 100;		// Size of grid units


	// Set target to current position
	$.each(devices, function(index, device) {
		// dev_jc_19/09/2013_a : replace offset with position to place items within the container.
		// device.target = [device.el.offset().left, device.el.offset().top];
		device.target = [device.el.position().left, device.el.position().top];
		// console.log('runTinyPhysics----- device.el.offset().left = ' + device.el.offset().left);
		// console.log('runTinyPhysics----- device.el.offset().top = ' + device.el.offset().top);
		// console.log('runTinyPhysics----- device.el.position().left = ' + device.el.position().left);
		// console.log('runTinyPhysics----- device.el.position().top = ' + device.el.position().top);
	});
	for(var step = 0; step<STEPS; step++) {
		$.each(devices, function(index, device) {
			var F = [0,0];	// force summation
			// Calculate spring force on each device
			$.each(device.connections, function(idx, connection) {
				var sign = device == connection.a ? 1 : -1;
				var m = (connection.getPhysicsLength() - SPRING_REST) * connection.strength * sign;
				var v = connection.getPhysicsUnitVector();
				F[0] += v[0] * m * SPRING_K;
				F[1] += v[1] * m * SPRING_K;
			});

			// Calculate repulsive force on each device (SLOW AND STUPID WAY I KNOW)
			$.each(devices, function(idx, other) {
				if(other == device) return; // Don't repell self
				if(other.physicsDistanceToSquared(device) < 1000000) {
					var v = other.physicsVectorTo(device);
					var l = Math.max(other.physicsDistanceTo(device), 0.001);
					var m = 1/(l*l);
					F[0] += v[0]* m * REPULSION_K;
					F[1] += v[1]* m * REPULSION_K;
				}
			});

			// Calculate force to keep device on screen
			if(device.target[0] + device.size.width > $(window).width()) 	 F[0] -= BOUNDARY_K;
			if(device.target[1] + device.size.height > $(window).height()) 	 F[1] -= BOUNDARY_K;
			//dev_jc_17/09/2013_a
			// if(device.target[0] + device.size.width > $('#container').width()) 	 F[0] -= BOUNDARY_K;
			// if(device.target[1] + device.size.height > $('#container').height()) 	 F[1] -= BOUNDARY_K;
			if(device.target[0] < 0)					 					 F[0] += BOUNDARY_K;
			if(device.target[1] < 1)					 					 F[1] += BOUNDARY_K;


			// Add (force/mass = accelration) to velocity
			device.velocity[0] += F[0] / device.mass;
			device.velocity[1] += F[1] / device.mass;

			// Add damping to velocity
			device.velocity[0] *= DAMPING;
			device.velocity[1] *= DAMPING;
			
			device.target[0] += device.velocity[0];
			device.target[1] += device.velocity[1];
		});
	}

	$.each(devices, function(index, device) {
		device.el.animate({
			left: device.target[0],
			top: device.target[1],
		}, {
			step: function(n) {
				device.update();
			}})
	});
}