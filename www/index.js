/* -----------------------------------------------------------------------------------
/* -----------------------------------------------------------------------------------
   Developed by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */


//See: https://stackoverflow.com/a/27939662/1288109
var geo = {
        /**
         * Calculate the bearing between two positions as a value from 0-360
         *
         * @param lat1 - The latitude of the first position
         * @param lng1 - The longitude of the first position
         * @param lat2 - The latitude of the second position
         * @param lng2 - The longitude of the second position
         *
         * @return int - The bearing between 0 and 360
         */
        bearing : function (lat1,lng1,lat2,lng2) {
            var dLon = this._toRad(lng2-lng1);
            var y = Math.sin(dLon) * Math.cos(this._toRad(lat2));
            var x = Math.cos(this._toRad(lat1))*Math.sin(this._toRad(lat2)) - Math.sin(this._toRad(lat1))*Math.cos(this._toRad(lat2))*Math.cos(dLon);
            var brng = this._toDeg(Math.atan2(y, x));
            return ((brng + 360) % 360);
        },

       /**
         * Since not all browsers implement this we have our own utility that will
         * convert from degrees into radians
         *
         * @param deg - The degrees to be converted into radians
         * @return radians
         */
        _toRad : function(deg) {
             return deg * Math.PI / 180;
        },

        /**
         * Since not all browsers implement this we have our own utility that will
         * convert from radians into degrees
         *
         * @param rad - The radians to be converted into degrees
         * @return degrees
         */
        _toDeg : function(rad) {
            return rad * 180 / Math.PI;
        },
    };



require([
    'esri/Map',
    'esri/Camera',
    'esri/views/MapView',
    'esri/views/SceneView',
    'esri/Viewpoint',
    'esri/geometry/Point',
    'esri/geometry/support/webMercatorUtils',
    'dojo/domReady!'
],
function (
    Map,
    Camera,
    MapView,
    SceneView,
    Viewpoint,
    Point,
    webMercatorUtils
    ) {
    $(document).ready(function () {
        function calculateHeading(point, index, array){
            if(index === 0){
                return 0;
            }
            const previous = array[index-1];
            //const p1 = new Point({
            //                    latitude: previous.lat,
            //                    longitude: previous.lon,
            //                    spatialReference: {
            //                        wkid: 102100
            //                    }
            //                });        
            //const p2 = new Point({
            //                    latitude: point.lat,
            //                    longitude: point.lon,
            //                    spatialReference: {
            //                        wkid: 102100
            //                    }
            //                });        
            //let v1 = Vector.create([p1.x, p1.y]);
            //let v2 = Vector.create([p2.x, p2.y]);
            //let spaceDiff = v2.subtract(v1);
            //heading = Math.atan2(spaceDiff.elements[1], spaceDiff.elements[0])/Math.PI*180;
            //heading = (270+heading)%360;
            //return heading;
                
            const heading = geo.bearing(previous.lat,previous.lon,point.lat,point.lon);
            return heading;
        }
        function loadGpx(fileName, callback){
            xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", fileName, false);
            xmlhttp.onreadystatechange = function ()
            {
                if(xmlhttp.readyState === 4)
                {
                    if(xmlhttp.status === 200 || xmlhttp.status == 0)
                    {
                        const allText = xmlhttp.responseText;
                        const gpx = new gpxParser(); //Create gpxParser Object
                        gpx.parse(allText); //parse gpx file from string data
                        const firstTrack = gpx.tracks[0];
                        const points = firstTrack.points;
                        
                        const firstPointTime = points[0].time.getTime();
                        //console.log(firstPointTime);
                        points.forEach((point, index, array) => {
                            point.time = point.time.getTime() - firstPointTime;
                            point.heading = calculateHeading(point, index, array);
                        })
                        
                        //// Smooth heading
                        //points.forEach((point, index, array) => {
                        //     const n = 15;
                        //     if(index < array.length - n - 1)
                        //     {
                        //         let sum = 0;
                        //         for(let i = 0; i< n; i++)
                        //         {
                        //             sum = sum + array[index + i].heading;
                        //         }
                        //         point.heading = (sum / n ) % 360;
                        //     }
                        //})

                        callback(points);
                    }
                }
            }
            xmlhttp.send();
        }
        
        // Get the closest number out of an array
        // See: https://stackoverflow.com/a/8584940/1288109
        function getClosestPointId(points, timestamp) {
            //console.log("timestamp is:", timestamp)

            var mid;
            var lo = 0;
            var hi = points.length - 1;
            while (hi - lo > 1) {
                mid = Math.floor ((lo + hi) / 2);
                if (points[mid].time < timestamp) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            if (timestamp - points[lo].time <= points[hi].time - timestamp) {
                return lo;
            }
            //console.log("High is:", hi)
            return hi;
        }
        const getPoint = function(points, timestamp, minEle){
            const closestPointId = getClosestPointId(points, timestamp);
            let closest = points[closestPointId];
            if(closest.time === timestamp){
                const result = new Point({
                            latitude: closest.lat,
                            longitude: closest.lon,
                            z: closest.ele + minEle,
                            spatialReference: {
                                wkid: 102100
                            }
                        });
                const heading = closest.heading;
                
                return {
                    location: result,
                    heading: heading,
                    speed: 200
                };
            }
            let next = null;
            if(closest.time < timestamp){
                next = points[closestPointId+1];
            } else {
                closest = points[closestPointId-1];
                next = points[closestPointId];
            }
            const result1 = new Point({
                        latitude: closest.lat,
                        longitude: closest.lon,
                        z: closest.ele,
                        spatialReference: {
                            wkid: 102100
                        }
                    });
            const result2 = new Point({
                        latitude: next.lat,
                        longitude: next.lon,
                        z: next.ele,
                        spatialReference: {
                            wkid: 102100
                        }
                    });
            const k = (timestamp - closest.time) / (next.time - closest.time);
            const result = new Point({
                        x: result1.x + (result2.x - result1.x) * k,
                        y: result1.y + (result2.y - result1.y) * k,
                        z: result1.z + (result2.z - result1.z) * k + minEle,
                        spatialReference: {
                            wkid: 102100
                        }
                    });


            const timeDiff = (next.time - closest.time) / 1000; //seconds
            const v1 = Vector.create([result1.x, result1.y]);
            const v2 = Vector.create([result2.x, result2.y]);
            const spaceDiff = v2.subtract(v1).modulus();
            const speed = spaceDiff / timeDiff;

            const heading1 = closest.heading;
            const heading2 = next.heading;
            return {
                location: result,
                heading: heading1+(heading2 - heading1) * k, //heading
                speed: speed
            };
        }
        
        loadGpx("Mix 17.gpx", function(points){            
            console.log(points);
            let s = "";
            points.forEach(p => s = s + `${p.time};${p.lon};${p.lat};${p.heading}\r\n`);
            console.log(s);
            
            var initialTime = null;
            
            //timeDiff = points[1].time - points[0].time;
            //console.log("timeDiff:", timeDiff);
            //var v1 = Vector.create([thisPoint.x, thisPoint.y]);
            //var v2 = Vector.create([nextPoint.x, nextPoint.y]);
            //spaceDiff = v2.subtract(v1).modulus();
            //console.log("spaceDiff:", spaceDiff);            
            //var speed = 200; // m/s
            //var speed = spaceDiff / timeDiff;
            //console.log("speed:", speed);
            //var speed = 0;

            // Enforce strict mode
            'use strict';

            // Plane flight details
            var lastTime = null;
            var speed = 0; //200; // m/s
			var minEle = 200;
            //var heading = 0;
            var {location, heading, speed} = getPoint(points, 0, minEle);

            // Initialize maps and views
            var map = new Map({
                basemap: 'satellite'
            });
            var viewMain = new MapView({
                container: 'map',
                map: map,
                zoom: 18,
                rotation: 0,
                center: location
            });
            var viewForward = new SceneView({
                container: 'forward-map',
                map: map,
                camera: {
                    heading: 0,
                    position: location,
                    tilt: 85
                }
            });
            var viewLeft = new SceneView({
                container: 'left-map',
                map: map,
                camera: {
                    heading: 270,
                    position: location,
                    tilt: 80
                }
            });
            var viewRight = new SceneView({
                container: 'right-map',
                map: map,
                camera: {
                    heading: 90,
                    position: location,
                    tilt: 80
                }
            });

            viewMain.ui.components = ['compass', 'zoom'];
            viewForward.ui.components = [];
            viewLeft.ui.components = [];
            viewRight.ui.components = [];

			var speedMultiplyFactor = 10;

            function draw(time) {
                //console.log(time, location, speed, heading)
                    
                //if (map.loaded && lastTime !== null) {
                if (map.loaded && initialTime !== null) {
                    ////var h = viewMain.rotation;
                    //var t = time - lastTime; // ms
                    //var d = speed * t / 1000;
                    //var v = Vector.create([location.x, location.y]);
                    //var x = Vector.create([0, d]).rotate(-heading * Math.PI / 180, Vector.create([0, 0]));
                    //var z = v.add(x);
                    //
                    //location.x = z.e(1);
                    //location.y = z.e(2);
                    //location.z = location.z;
                    
                    var t = time - initialTime; // ms
                    var {location, heading, speed} = getPoint(points, t * speedMultiplyFactor, minEle);
                    //console.log(location, heading, speed);
                    
                    //let nextLocation = getPoint(points, currentPointId+1);                    
                    //let v1 = Vector.create([location.x, location.y]);
                    //let v2 = Vector.create([nextLocation.x, nextLocation.y]);
                    //let spaceDiff = v2.subtract(v1);
                    //let sign = Math.sign(spaceDiff.elements[1]);
                    //let angle = spaceDiff.angleFrom(Vector.create([1, 0]));
                    //heading = angle / Math.PI * 180 + 90;
                    //console.log(spaceDiff, heading);
                    ////console.log(heading);
                    //angle = Math.atan2(spaceDiff.elements[1], spaceDiff.elements[0])/Math.PI*180 + 90;
                    //heading = angle;
                    //console.log(heading);

                    viewMain.center = location;
                    viewMain.rotation = -heading;
                    viewForward.camera = new Camera({
                        heading: heading,
                        position: location,
                        tilt: 85
                    });
                    viewLeft.camera = new Camera({
                        heading: heading - 90,
                        position: location,
                        tilt: 80
                    });
                    viewRight.camera = new Camera({
                        heading: heading + 90,
                        position: location,
                        tilt: 80
                    });

                    var geographic = webMercatorUtils.webMercatorToGeographic(location);

                    $('#dial-speed').html(format.format('d')(speed) + ' m/s (x' + format.format('d')(speedMultiplyFactor) + ')');
                    $('#dial-altitude').html(format.format('d')(location.z-minEle) + ' m (+'+ format.format('d')(minEle) + ')');
                    $('#dial-heading').html(format.format('d')(heading) + '°');
                    $('#dial-location-x').html(ConvertDDToDMS(geographic.x, true));
                    $('#dial-location-y').html(ConvertDDToDMS(geographic.y, false));
                } else {
                    initialTime = time; // - 78000;
                }
                
                //lastTime = time;                
                requestAnimationFrame(draw, location, speed, heading);
            }



            window.requestAnimationFrame(draw);


            $('#button-speed-up').click(function () {
                //speed += 100;
				speedMultiplyFactor++;
            });
            $('#button-speed-dn').click(function () {
                //speed -= 100;
                //if (speed < 0) {
                //    speed = 0;
                //}
				speedMultiplyFactor --;
                if (speedMultiplyFactor < 1) {
                    speedMultiplyFactor = 1;
                }
            });
            $('#button-altitude-up').click(function () {
                //location.z += 100;
				minEle += 100;
            });
            $('#button-altitude-dn').click(function () {
                //location.z -= 100;
                //if (location.z < 0) {
                //    location.z = 0;
                //}
				minEle -= 100;
                if (minEle < 0) {
                    minEle = 0;
                }
            });
            $('#button-heading-up').click(function () {
                heading += 10;
                if (heading > 360) {
                    heading -= 360;
                }
            });
            $('#button-heading-dn').click(function () {
                heading -= 10;
                if (heading < 0) {
                    heading += 360;
                }
            });

            function ConvertDDToDMS(d, lng) {
                var dir = d < 0 ? lng ? 'W' : 'S' : lng ? 'E' : 'N';
                var deg = 0 | (d < 0 ? d = -d : d);
                var min = 0 | d % 1 * 60;
                var sec = (0 | d * 60 % 1 * 60);
                return deg + '° ' + format.format('02d')(min) + '\' ' + format.format('02d')(sec) + '" ' + dir;
            }

            String.prototype.format = function () {
                var s = this;
                var i = arguments.length;
                while (i--) {
                    s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
                }
                return s;
            };
        });
    });
});

// --------------------------------------------------------------------------------------------
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// RequestAnimationFrame polyfill by Erik Möller
// Fixes from Paul Irish and Tino Zijdel
// --------------------------------------------------------------------------------------------
(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                                      window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
}());
