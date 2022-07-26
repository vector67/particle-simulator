"use strict";
document.addEventListener("DOMContentLoaded", loadCanvas);
var particles = [];
var particleSize = 2;
var particleMass = 8;
var numParticles = 0;
var frame = 0;
var startFrame = frame;
var jitter = 300;
var damping = 5000;
var consecutiveProblemFrames = 0;
var frictionConstant = 0.4;
var framerate = 30;
var particleLife = 1000;
//~ var particlesPerSecond = 3000;
var particlesPerSecond = 3000;
var particlesPerFrame = particlesPerSecond / framerate;
var frameTimes = [];
var currentRepulsionParticle;
var currentType = "spiral";
var scalingFactor = 1;
var currentScale = 1;

var pool = [];
var poolRelease = function (obj) {
    pool.push(obj);
};
var poolGet = function (x, y, size, color, vx, vy, ax, ay, m, a) {
    if (pool.length) {
        var returning = pool.pop();
        returning.setVars(x, y, size, color, vx, vy, ax, ay, m, a);
        return returning;
    }
    return new Particle(x, y, size, color, vx, vy, ax, ay, m, a);
}

var Force = function (vec, type) {
    this.vec = vec;
    this.type = type;
}
var mag;
var d;
var Vector = function (x, y) {
    var self = this
    this.x = x;
    this.y = y;
    this.reset = function () {
        self.x = 0;
        self.y = 0;
    }
    this.divide = function (arg) {
        self.x /= arg;
        self.y /= arg;
    }
    this.scalarProduct = function (arg) {
        self.x *= arg;
        self.y *= arg;
    }
    this.getScalarProduct = function (arg) {
        return new Vector(self.x * arg, self.y * arg);
    }
    this.addVector = function (vec) {
        if (vec instanceof Vector) {
            self.x += vec.x;
            self.y += vec.y;
        }
    }
    this.setMagnitudeAndDirection = function (mag, d) {
        self.x = Math.cos(d) * mag;
        self.y = Math.sin(d) * mag;
    }
    this.setMagnitude = function (mag) {
        d = self.direction();
        self.x = Math.cos(d) * mag;
        self.y = Math.sin(d) * mag;
    }
    this.setDirection = function (d) {
        mag = self.getMagitude();
        self.x = Math.cos(d) * mag;
        self.y = Math.sin(d) * mag;
    }
    this.getMagnitude = function () {
        return Math.sqrt(Math.pow(self.x, 2) + Math.pow(self.y, 2));
    };
    this.getDirection = function () {
        return Math.atan2(this.y, self.x)
    };
}
var mousePos = new Vector(-1000, -1000);
var friction;
var frictionDirection;
var Particle = function (x, y, m, color, vx, vy, ax, ay, a) {
    var self = this;
    m = Math.max(m, 2);
    this.age = Math.floor(Math.random() * -60);
    this.angle = a
    this.position = new Vector(x + 1, y + 1);
    this.startPosition = new Vector(x, y);
    this.homePosition = new Vector(x, y);
    this.size = 1.5 * Math.sqrt(m);
    this.color = color;
    this.velocity = new Vector(vx, vy);
    this.acceleration = new Vector(ax, ay);
    this.mass = m;
    this.forces = {};
    this.totalForce = 0;
    this.setVars = function (x, y, m, color, vx, vy, ax, ay, a) {
        self.age = Math.floor(Math.random() * -60);
        self.angle = a
        self.position = new Vector(x, y);
        self.startPosition = new Vector(x, y);
        self.homePosition = new Vector(x, y);
        //~ this.size = Math.max(1.5*Math.sqrt(m)*size,3);
        //        self.size = Math.max(1.5 * Math.sqrt(m), 3);
        self.size = 1.5 * Math.sqrt(m);
        self.color = color;
        self.velocity = new Vector(vx, vy);
        self.acceleration = new Vector(ax, ay);
        //~ this.mass = Math.max(m,3);
        self.mass = m;
        self.forces = {};
    }
    this.replaceForce = function (force, type) {
        self.forces[type] = force;
    }
    this.getForce = function (type) {
        return self.forces[type];
    }
    this.addForce = function (force) {
        self.forces[force.type] = force;
    };
    this.removeForce = function (force) {
        if (force.type in self.forces) {
            delete self.forces[force.type];
        }
    };
    this.squareDistance = function (vec) {
        if (vec instanceof Vector) {
            return ((Math.pow(vec.x - self.position.x, 2) + Math.pow(vec.y - self.position.y, 2)));
        }
        if (vec instanceof Particle) {
            return ((Math.pow(vec.position.x - self.position.x, 2) + Math.pow(vec.position.y - self.position.y, 2)));
        }
    }
    this.distance = function (vec) {
        return (Math.sqrt(self.squareDistance(vec)));
    }
    this.directionTo = function (vec) {
        if (vec instanceof Vector) {
            return (Math.atan2((vec.y - self.position.y), (vec.x - self.position.x)));
        }
        if (vec instanceof Particle) {
            return (Math.atan2((vec.position.y - self.position.y), (vec.position.x - self.position.x)));
        }
    }
    this.doneForceProblem = false;
    this.update = function () {
        self.age++;
        self.acceleration.reset();
        self.totalForce = 0;
        var dontecho = false;
        if ("friction" in self.forces) {
            friction = self.getForce("friction");
            if (isNaN(friction.vec.x)) {
                dontecho = true;
            }
        } else {
            friction = new Force(new Vector(0, 0), "friction");
        }
        frictionDirection = self.directionTo(new Vector(self.position.x + self.velocity.x, self.position.y + self.velocity.y)) + Math.PI;
        friction.vec.setMagnitudeAndDirection(frictionConstant * self.velocity.getMagnitude(), frictionDirection);
        if (isNaN(friction.vec.x) && !dontecho) {

            //console.log("nan friction" + friction.vec.x + "," + friction.vec.y + " velocity=" + this.velocity.x + "," + this.velocity.y); // this.position.x + "+" + this.velocity.x + "," + this.position.y + "+" + this.velocity.y);
        }
        self.addForce(friction, "friction");

        if (self.position.x > 2000 || self.position.y > 2000 || self.position.x < -2000 || self.position.y < -2000) {
            for (forceType in self.forces) {
                if (self.forces.hasOwnProperty(forceType)) {
                    if (forceType != "returnForce") {
                        self.forces[forceType].vec.x = 0;
                        self.forces[forceType].vec.y = 0;
                    }
                }
            }
            if (self.position.x > 2000 || self.position.y > 2000) {
                self.position.x = 2000;
                self.position.y = 2000;
            }
            if (self.position.x < -2000 || self.position.y < -2000) {
                self.position.x = -2000;
                self.position.y = -2000;
            }
        }
        for (var forceType in self.forces) {
            if (self.forces.hasOwnProperty(forceType)) {
                if (!isNaN(self.forces[forceType].vec.getScalarProduct(1 / self.mass).x)) {
                    //console.log("got a nan force on " + forceType);

                    self.acceleration.addVector(self.forces[forceType].vec.getScalarProduct(1 / self.mass));
                    if (self.acceleration.x > 1000) {
                        self.acceleration.x = 1000;
                    } else if (self.acceleration.x < -1000) {
                        self.acceleration.x = -1000;
                    }
                    if (self.acceleration.y > 1000) {
                        self.acceleration.y = 1000;
                    } else if (self.acceleration.y < -1000) {
                        self.acceleration.y = -1000;
                    }
                    if (forceType != "returnForce")
                        self.totalForce += self.forces[forceType].vec.getMagnitude() / 2;
                } else {
                    self.forces[forceType].vec.reset();
                }
            }
        }
        if (isNaN(self.acceleration.x) || isNaN(self.acceleration.y) || isNaN(self.velocity.x) || isNaN(self.velocity.y) || isNaN(self.position.x) || isNaN(self.position.y)) {
            self.acceleration.x = 0;
            self.acceleration.y = 0;
            self.velocity.x = 0;
            self.velocity.y = 0;

        }
        self.velocity.addVector(self.acceleration);
        if (isNaN(self.velocity.x) && !dontecho) {

            console.log("nan velocity velocity=" + self.velocity.x + "," + self.velocity.y + " accleration=" + self.acceleration.x + "," + self.acceleration.y); // this.position.x + "+" + this.velocity.x + "," + this.position.y + "+" + this.velocity.y);
        }
        /*if(this.velocity.x>10){
            this.velocity.x = 10;
        } else if (this.velocity.x<-10){
            this.velocity.x = -10;
        }
        if(this.velocity.y>10){
            this.velocity.y = 10;
        } else if (this.velocity.y<-10){
            this.velocity.y = -10;
        }*/
        self.position.addVector(this.velocity);
    }
    this.previousSize = this.size;
    this.isCool = function () {
        self.previousSize = this.size;
        //self.size = 10;
        //self.mass /= 10;
        self.color = "rgb(0,140,180)";
    }

    this.isNotCool = function () {
        //self.size = this.previousSize;
        //self.mass *= 10;
    }

}
// Standard Normal variate using Box-Muller transform.
function randomSize() {
    var u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
    var v = 1 - Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

var currentEquationX = function () {};
var currentEquationY = function () {};

function getParticlePos(a, i, type) {
    var p = {
        x: 0,
        y: 0
    };
    if (type == "infinity") {
        var particlesPerSecond = 3000;
        p.x = a * Math.sqrt(2) * Math.cos(i) / (Math.pow(Math.sin(i), 2) + 1) + (Math.random() - 0.5) * jitter / 2;
        p.y = a * Math.sqrt(2) * Math.cos(i) * Math.sin(i) / (Math.pow(Math.sin(i), 2) + 1) + (Math.random() - 0.5) * jitter;
    } else if (type == "random") {
        var particlesPerSecond = 3000;
        p.x = (Math.random() - 0.5) * jitter / 2 * 20;
        p.y = (Math.random() - 0.5) * jitter / 2 * 8;
    } else if (type == "spiral") {
        var particlesPerSecond = 3000;
        p.x = (20 + 170 * i) * Math.cos(i * 4) + (Math.random() - 0.5) * jitter / 5;
        p.y = (100 + 100 * i) * Math.sin(i * 4) + (Math.random() - 0.5) * jitter / 5;
    } else if (type == "heart") {
        var particlesPerSecond = 100;
        p.x = -520 * (Math.pow(Math.sin(i * 2), 3));
        p.y = (13 * Math.cos(i * 2) - 5 * Math.cos(4 * i) - 2 * Math.cos(6 * i) - Math.cos(8 * i)) * -30;
    } else {
        var particlesPerSecond = 100;
        p.x = currentEquationX(i) + (Math.random() - 0.5) * jitter / 5;
        p.y = currentEquationY(i) + (Math.random() - 0.5) * jitter / 5;
    }
    //cos(i)*300+sin(i*10)*100
    //sin(i)*400+cos(i*10)*100

    //-520*sin(i*2)^3
    //(13*cos(i*2)-5*cos(4*i)-2*cos(6*i)-cos(8*i))*-30
    return p;
}

function createParticle(a, i, w, h) {
    var pos = getParticlePos(a, i, currentType);
    var p = poolGet(pos.x / 3400 * w * scalingFactor, pos.y / 1500 * h * scalingFactor, (randomSize() * particleMass + particleMass), "hsl(12, 100%, " + Math.abs(i - Math.PI) / Math.PI * 100 + "%)", (Math.random() - 0.5), (Math.random() - 0.5), 0, 0, i);
    return p;
}

function changeParticles(type, w, h) {
    currentType = type;
    if (type != "infinty" && type != "random" && type != "spiral" && type != "heart") {
        var xys = type.split("||");
        currentEquationX = nerdamer(xys[0]).buildFunction();
        currentEquationY = nerdamer(xys[1]).buildFunction();
    }
    var a = 1000;
    var upperBound = 2 * Math.PI;
    var canvasDiv = document.getElementById("backgroundCanvasDiv");
    var pos;
    var particleLength = particles.length;
    var counter = 0;
    var bPos = getParticlePos(a, upperBound, type);
    bPos.x = bPos.x / 3400 * w;
    bPos.y = bPos.y / 1500 * h;
    var xShift = 0,
        yShift = 0;
    /*if (bPos.x < 0 || bPos.y < 0) {
        xShift = -bPos.x;
        yShift = -bPos.y;
        bPos.x += xShift;
        bPos.y += yShift;
    }*/
    console.log(bPos.x + "," + bPos.y);
    if (bPos.x > w || bPos.y > h) {
        var widthScalingFactor = w / bPos.x;
        var heightScalingFactor = h / bPos.y;
        console.log("Scaling");
        scalingFactor = Math.min(Math.abs(widthScalingFactor), Math.abs(heightScalingFactor));
    } else {
        scalingFactor = 1;
    }
    //var smallestPos = getParticlePos(a, 0, type);
    console.log("Shifting by " + xShift + "," + yShift + " and scale by " + scalingFactor);
    for (var i = 0; i < upperBound && counter < particleLength; i += upperBound / particleLength, counter++) {
        pos = getParticlePos(a, i, type);
        particles[counter].homePosition.x = (pos.x) * scalingFactor / 3400 * w;
        particles[counter].startPosition.x = (pos.x) * scalingFactor / 3400 * w;
        particles[counter].homePosition.y = (pos.y) * scalingFactor / 1500 * h;
        particles[counter].startPosition.y = (pos.y) * scalingFactor / 1500 * h;
    }
}

function loadCanvas() {
    if (document.getElementById("backgroundCanvasDiv") != null) {
        if (window.location.hash.substr(1) != "") {
            document.body.classList.add(window.location.hash.substr(1));
            console.log(window.location.hash.substr(1));
        }
        window.onhashchange = function () {
            document.body.classList.remove("ass1");
            document.body.classList.remove("ass2");
            document.body.classList.remove("ass3");
            document.body.classList.remove("ass4");
            document.body.classList.remove("ass5");
            document.body.classList.remove("ass6");
            document.body.classList.add(window.location.hash.substr(1));
        };
        var a = 1000;
        var upperBound = 2 * Math.PI;
        var canvasDiv = document.getElementById("backgroundCanvasDiv");
        var p;
        for (var i = 0; i <= upperBound; i += upperBound / numParticles) {
            p = createParticle(a, i, canvasDiv.offsetWidth, canvasDiv.offsetHeight);
            particles.push(p);
        }
        currentRepulsionParticle = particles[0];

        var canvas = document.getElementById("backgroundCanvas");
        canvas.addEventListener("mousemove", function (event) {
            mousePos.x = (event.clientX - canvas.getBoundingClientRect().left - canvas.width / 2) / Math.pow(1 + throbbingValue, Math.abs(Math.sin(frame % throbbingTime / (throbbingTime - 1) * 2 * Math.PI)));
            mousePos.y = (event.clientY - canvas.getBoundingClientRect().top - canvas.height / 2) / Math.pow(1 + throbbingValue, Math.abs(Math.sin(frame % throbbingTime / (throbbingTime - 1) * 2 * Math.PI)));
        });
        console.log(canvasDiv.offsetWidth);
        canvas.width = canvasDiv.offsetWidth;
        canvas.height = canvasDiv.offsetHeight;
        console.log(canvas);
        var ctx = canvas.getContext("2d");

        window.setInterval(renderFrame, 1000 / framerate);
        document.getElementById("infinityButton").addEventListener("click", function (event) {
            changeParticles("infinity", canvasDiv.offsetWidth, canvasDiv.offsetHeight);
        });
        document.getElementById("randomSpreadButton").addEventListener("click", function (event) {
            changeParticles("random", canvasDiv.offsetWidth, canvasDiv.offsetHeight);
        });
        document.getElementById("spiralButton").addEventListener("click", function (event) {
            changeParticles("spiral", canvasDiv.offsetWidth, canvasDiv.offsetHeight);
        });
        document.getElementById("heartButton").addEventListener("click", function (event) {
            changeParticles("heart", canvasDiv.offsetWidth, canvasDiv.offsetHeight);
        });
        document.getElementById("customButton").addEventListener("click", function (event) {
            changeParticles(document.getElementById("customInputX").value + "||" + document.getElementById("customInputY").value, canvasDiv.offsetWidth, canvasDiv.offsetHeight);
        });
        document.getElementById("customInputX").addEventListener("keyup", function (event) {
            changeParticles(document.getElementById("customInputX").value + "||" + document.getElementById("customInputY").value, canvasDiv.offsetWidth, canvasDiv.offsetHeight);
        });
        document.getElementById("customInputY").addEventListener("keyup", function (event) {
            changeParticles(document.getElementById("customInputX").value + "||" + document.getElementById("customInputY").value, canvasDiv.offsetWidth, canvasDiv.offsetHeight);
        });
        document.getElementById("throbbingTime").addEventListener("keyup", function (event) {
            throbbingTime = Math.max(this.value * 1, 3);
        });
        if (document.getElementById("throbbingTime") && document.getElementById("throbbingTime").value != 0) {
            throbbingTime = Math.max(document.getElementById("throbbingTime").value * 1, 3);
        }
        document.getElementById("throbbingInput").addEventListener("keyup", function (event) {
            throbbingValue = this.value * 1;
        });
        if (document.getElementById("throbbingInput") && document.getElementById("throbbingInput").value != 0) {
            throbbingValue = document.getElementById("throbbingInput").value * 1;
        }
    }
}
var createdReturnForceFrame = 99999;
var lastTime;

function renderFrame() {
    lastTime = Date.now();
    var canvas = document.getElementById("backgroundCanvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    doParticles(particles, ctx, canvas);

    var canvasDiv = document.getElementById("backgroundCanvasDiv");
    frame += 1;
    var currentTime = Date.now();
    var deltaTime = currentTime - lastTime;
    frameTimes.push({
        particles: particles.length,
        time: deltaTime
    });
    if (frameTimes.length > 100) {
        frameTimes.splice(1, 1);
    }
    var sumparticles = 0;
    var sumtimes = 0;
    for (var k = 0; k < frameTimes.length; k++) {
        sumparticles += frameTimes[k].particles;
        sumtimes += frameTimes[k].time;
    }
    var timePerParticle = sumtimes / sumparticles;
    if ((deltaTime > 1000 / framerate * 2) && (particles.length > 100)) {
        consecutiveProblemFrames++;
        if (consecutiveProblemFrames > 2) {
            console.log("WE'RE DROPPING PARTICLES BECAUSE OUR FRAME RATE WAS TOO LOW. It was supposed to take " + 1000 / framerate + "ms to complete, but it took " + deltaTime);
            //This means we are dropping frames
            for (var i = 0; i < particles.length - particles.length / (deltaTime * framerate / 1400); i++) {
                particles[Math.floor(Math.random() * particles.length)].age = particleLife - 10;
            }
        }
    } else {
        consecutiveProblemFrames = 0;
        var j = 0;
        var max = Math.min(particlesPerFrame + particles.length, 1000 / framerate / timePerParticle);
        max -= particles.length;
        while (j < max) {
            particles.push(createParticle(1000, Math.random() * 2 * Math.PI, canvasDiv.offsetWidth, canvasDiv.offsetHeight));
            j++;
        }
        //console.log(particles.pop());
    }
}
var currentLink = 1;
var throbbingValue = 0;
var throbbingTime = 30;

function drawParticle(ctx, canvas, circ) {
    ctx.beginPath();
    ctx.fillStyle = circ.color;
    ctx.arc(canvas.width / 2 + (circ.position.x * Math.pow(1 + throbbingValue, Math.abs(Math.sin(frame % throbbingTime / (throbbingTime - 1) * 2 * Math.PI)))), canvas.height / 2 + (circ.position.y * Math.pow(1 + throbbingValue, Math.abs(Math.sin(frame % throbbingTime / (throbbingTime - 1) * 2 * Math.PI)))), circ.size, 0, 2 * Math.PI);
    ctx.fill();
}
var colorPercentage;
var alpha;

function updateColor(circ, i) {
    if (circ == currentRepulsionParticle) {
        return;
    }
    colorPercentage = (Math.abs((circ.angle / 2 / Math.PI * 80 + (frame / 2)) % 80 - 40) + 5) * 2 / 100;
    alpha = 1;
    if (circ.age < 10) {
        alpha = Math.max(0, circ.age) / 10;
    } else if (circ.age > particleLife - 10) {
        alpha = (particleLife - circ.age) / 10;
    }
    //~ console.log(circ.totalForce);
    circ.color = "hsla(" + (40 * ((20 + colorPercentage * 100) % 100 / 100) + 180 + (circ.totalForce * 15)) + ", 100%, " + calculateLightness(colorPercentage, circ.totalForce, i) + "%, " + alpha + ")";
}

function calculateLightness(p, force, i) {
    //~ return (((p)*100+10));
    return (((p) * 100 + 10)) / (force + 50) * 50;
}
var mouseRepulsionPower = 1;

function doMouseRepulsionForce(circ, mousePos) {

    var mouseRepulsion;
    if (frame != startFrame) {
        mouseRepulsion = circ.getForce("mouseRepulsion");
        if (mouseRepulsion == undefined) {
            mouseRepulsion = new Force(new Vector(0, 0), "mouseRepulsion");
        }
    } else {
        mouseRepulsion = new Force(new Vector(0, 0), "mouseRepulsion");
    }
    //    var mouseDistanceSquare = Math.pow(circ.squareDistance(mousePos), 1);

    var mouseDistanceSquare = Math.pow(circ.squareDistance(mousePos), mouseRepulsionPower);
    if (mouseDistanceSquare < 16000) {
        var mouseRepulsionDirection = circ.directionTo(mousePos) - Math.PI / 1.3;
        mouseRepulsion.vec.setMagnitudeAndDirection(Math.pow(100000, mouseRepulsionPower) / mouseDistanceSquare / Math.pow(Math.pow(1 + throbbingValue, Math.abs(Math.sin(frame % throbbingTime / (throbbingTime - 1) * 2 * Math.PI))), 2), mouseRepulsionDirection);
    } else {
        mouseRepulsion.vec.setMagnitudeAndDirection(0, mouseRepulsionDirection);
    }
    //~ mouseRepulsion.vec.setMagnitudeAndDirection(80000/mouseDistanceSquare/Math.pow(Math.pow(1+throbbingValue,Math.abs(Math.sin(frame%throbbingTime/(throbbingTime-1)*2*Math.PI))),2), mouseRepulsionDirection);
    circ.addForce(mouseRepulsion, "mouseRepulsion");
}

function doParticleRepulsionForce(circ, randomParticlePos, id, magnitude) {

    var particleRepulsion;
    if (frame != startFrame) {
        particleRepulsion = circ.getForce("particleRepulsion" + id);
        if (particleRepulsion == undefined) {
            particleRepulsion = new Force(new Vector(0, 0), "particleRepulsion" + id);
        }
    } else {
        particleRepulsion = new Force(new Vector(0, 0), "particleRepulsion" + id);
    }
    var particleDistanceSquare = Math.pow(circ.squareDistance(randomParticlePos), 0.9);
    var particleRepulsionDirection = circ.directionTo(randomParticlePos) + Math.PI / 2;
    particleRepulsion.vec.setMagnitudeAndDirection(Math.min(800 / particleDistanceSquare * magnitude, 100), particleRepulsionDirection);
    // circ.addForce(particleRepulsion, "particleRepulsion" + id);
}

function doReturnForce(circ) {

    if (!(circ.position.x == circ.homePosition.x || circ.position.y == circ.homePosition.y)) {
        var returnForce;
        if (createdReturnForceFrame < frame) {
            returnForce = circ.getForce("returnForce");
            if (returnForce == undefined) {
                returnForce = new Force(new Vector(0, 0), "returnForce");
            }
        } else {
            returnForce = new Force(new Vector(0, 0), "returnForce");
            createdReturnForceFrame = frame;
        }

        var startDistanceSquare = circ.distance(circ.homePosition) / 100;
        //~ var startDistanceSquare = circ.squareDistance(circ.homePosition)/10;
        var startDirection = circ.directionTo(circ.homePosition);
        returnForce.vec.setMagnitudeAndDirection(startDistanceSquare, startDirection);
        circ.addForce(returnForce, "returnForce");
    }
}

function doParticles(particles, ctx, canvas) {
    if (frame % (Math.floor(Math.random() * 300)) == 0 && particles.length > 0) {
        currentRepulsionParticle.isNotCool();
        var counter = 0;
        currentRepulsionParticle = particles[Math.floor(Math.random() * particles.length)];
        while (counter < 10 && currentRepulsionParticle.age < 10) {
            currentRepulsionParticle = particles[Math.floor(Math.random() * particles.length)];
            counter++;
        }
        currentRepulsionParticle.isCool();
    }
    var particleLength = particles.length;
    var circ;
    var frameCycle = frame % 30;
    if (frameCycle == 0) {
        currentScale = particles[0].homePosition.x / particles[0].startPosition.x;
    }
    currentScale *= 1 + 0.5 / 30;
    document.getElementById("launch").textContent = particleLength;
    for (var i = 0; i < particleLength; i++) {
        circ = particles[i];
        if (i == 0 && frame % 15 == 0) {
            console.log(circ.forces);
            console.log(circ.position.x + "," + circ.position.y);
        }
        if (frameCycle == 0) {
            //circ.homePosition = circ.startPosition;
        } else {
            //circ.homePosition.x *= 1+0.5/30;
            //circ.homePosition.y *= 1+0.5/30;
        }
        if (circ.age >= particleLife) {
            particles.splice(i, 1);
            i--;
            poolRelease(circ);
            particleLength--;
            continue;
        }
        doReturnForce(circ);

        doMouseRepulsionForce(circ, mousePos);
        if (currentRepulsionParticle != circ) {
            doParticleRepulsionForce(circ, currentRepulsionParticle.position, 1, 1);
        }
        if (i != 0) {
            //doParticleRepulsionForce(circ, new Vector(0, 0), 2, 1);
        }
        //console.log(mouseR)
        //circ.ax *= 0.1;
        //circ.ay *= 0.1;
        //console.log(circ.ax);
        updateColor(circ, i);
        //circ.color= "hsla("+(400*((20+colorPercentage*100)%100/100)+0)+", 100%, "+(colorPercentage*100%50*2+10)+"%, "+alpha+")";
        if (circ.age < particleLife) {
            circ.update();
            drawParticle(ctx, canvas, circ);
        }
    }
}
/*
function rotateMenu(event){
	var $this = $(this);
	var newCurrentLink = $this.attr("data-num");
	console.log(newCurrentLink);
	var angle = (newCurrentLink-currentLink)*72;
	$(".circularMenu li").each(function(num, e){
		liElement = $(this);
		currentDegrees = (newCurrentLink-num-1)*72;
		console.log(angle);
		$({deg:currentDegrees+360}).animate({deg: angle+currentDegrees+360}, {duration: 2000, 
			step: function(now){
				$.style(e,{transform: 'rotate('+ now + 'deg)'});
			}
		}
		);
	});
	currentLink = newCurrentLink;
			
}*/
