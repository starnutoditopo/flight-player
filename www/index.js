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
    bearing: function (lat1, lng1, lat2, lng2) {
        var dLon = this._toRad(lng2 - lng1);
        var y = Math.sin(dLon) * Math.cos(this._toRad(lat2));
        var x = Math.cos(this._toRad(lat1)) * Math.sin(this._toRad(lat2)) - Math.sin(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * Math.cos(dLon);
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
    _toRad: function (deg) {
        return deg * Math.PI / 180;
    },

    /**
     * Since not all browsers implement this we have our own utility that will
     * convert from radians into degrees
     *
     * @param rad - The radians to be converted into degrees
     * @return degrees
     */
    _toDeg: function (rad) {
        return rad * 180 / Math.PI;
    },
};

function calculateHeading(index, rawPoints) {
    if (index === 0) {
        return 0;
    }
    const rawPoint = rawPoints[index];
    const previous = rawPoints[index - 1];
    const heading = geo.bearing(previous.lat, previous.lon, rawPoint.lat, rawPoint.lon);
    return heading;
}

// Get the closest point whose time is lower than the specified timestamp.
// See: https://stackoverflow.com/a/8584940/1288109
function getClosestLowerPointId(rawPoints, timestamp) {
    let mid;
    let lo = 0;
    let hi = rawPoints.length - 1;
    while (hi - lo > 1) {
        mid = Math.floor((lo + hi) / 2);
        if (rawPoints[mid].time < timestamp) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    return lo;
}

require([
    'esri/Map',
    'esri/Camera',
    'esri/views/MapView',
    'esri/views/SceneView',
    'esri/geometry/Point',
    'esri/geometry/support/webMercatorUtils',
    'dojo/domReady!'
],
    function (
        Map,
        Camera,
        MapView,
        SceneView,
        Point,
        webMercatorUtils
    ) {
        $(document).ready(function () {
            function loadGpx(fileName, callback) {
                xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", fileName, true);
                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState === 4) {
                        if (xmlhttp.status === 200 || xmlhttp.status == 0) {
                            const allText = xmlhttp.responseText;
                            const gpx = new gpxParser(); //Create gpxParser Object
                            gpx.parse(allText); //parse gpx file from string data
                            const firstTrack = gpx.tracks[0];
                            const rawPoints = firstTrack.points;

                            const firstPointTime = rawPoints[0].time.getTime();

                            rawPoints.forEach((rawPoint, index, array) => {
                                rawPoint.time = rawPoint.time.getTime() - firstPointTime;
                                rawPoint.heading = calculateHeading(index, array);
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

                            callback(rawPoints);
                        }
                    }
                }
                xmlhttp.send();
            }
            const getLocationInfoAtTime = function (rawPoints, timestamp) {
                const spatialReference = {
                    wkid: 102100
                };
                const closestPointId = getClosestLowerPointId(rawPoints, timestamp);
                let closest = rawPoints[closestPointId];
                let next = rawPoints[closestPointId + 1];
                const result1 = new Point({
                    latitude: closest.lat,
                    longitude: closest.lon,
                    z: closest.ele,
                    spatialReference: spatialReference
                });
                const result2 = new Point({
                    latitude: next.lat,
                    longitude: next.lon,
                    z: next.ele,
                    spatialReference: spatialReference
                });
                const k = (timestamp - closest.time) / (next.time - closest.time);
                const result = new Point({
                    x: result1.x + (result2.x - result1.x) * k,
                    y: result1.y + (result2.y - result1.y) * k,
                    z: result1.z + (result2.z - result1.z) * k,
                    spatialReference: spatialReference
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
                    heading: heading1 + (heading2 - heading1) * k, //heading
                    speed: speed
                };
            }

            loadGpx("Mix 17.gpx", function (rawPoints) {
                // console.log(points);
                // let s = "";
                // points.forEach(p => s = s + `${p.time};${p.lon};${p.lat};${p.heading}\r\n`);
                // console.log(s);

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
                var deltaAltitude = 200;
                var deltaHeading = 0;
                var tilt = 80;
                var deltaTilt = 0;
                var { location, heading, speed } = getLocationInfoAtTime(rawPoints, 0);
                location.z += deltaAltitude;

                // Initialize maps and views
                var map = new Map({
                    basemap: 'satellite'
                });
                var viewMain = new MapView({
                    container: 'map',
                    map: map,
                    zoom: 18,
                    rotation: -(heading + deltaHeading),
                    center: location
                });
                var viewForward = new SceneView({
                    container: 'forward-map',
                    map: map,
                    camera: {
                        heading: heading + deltaHeading,
                        position: location,
                        tilt: tilt + deltaTilt + 5
                    }
                });
                var viewLeft = new SceneView({
                    container: 'left-map',
                    map: map,
                    camera: {
                        heading: heading + deltaHeading - 90,
                        position: location,
                        tilt: tilt + deltaTilt
                    }
                });
                var viewRight = new SceneView({
                    container: 'right-map',
                    map: map,
                    camera: {
                        heading: heading + deltaHeading + 90,
                        position: location,
                        tilt: tilt + deltaTilt
                    }
                });

                viewMain.ui.components = ['compass', 'zoom'];
                viewForward.ui.components = [];
                viewLeft.ui.components = [];
                viewRight.ui.components = [];

                var speedMultiplyFactor = 10;

                function draw(time) {
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
                        var { location, heading, speed } = getLocationInfoAtTime(rawPoints, t * speedMultiplyFactor, deltaAltitude);
                        location.z += deltaAltitude;

                        viewMain.center = location;
                        viewMain.rotation = -(heading + deltaHeading);
                        viewForward.camera = new Camera({
                            heading: heading + deltaHeading,
                            position: location,
                            tilt: tilt + deltaTilt + 5
                        });
                        viewLeft.camera = new Camera({
                            heading: heading + deltaHeading - 90,
                            position: location,
                            tilt: tilt + deltaTilt
                        });
                        viewRight.camera = new Camera({
                            heading: heading + deltaHeading + 90,
                            position: location,
                            tilt: tilt + deltaTilt
                        });

                        var geographic = webMercatorUtils.webMercatorToGeographic(location);

                        $('#dial-tilt').html(format.format('d')(tilt) + '° (+' + format.format('d')(deltaTilt) + ')');
                        $('#dial-speed').html(format.format('d')(speed) + ' m/s (x' + format.format('d')(speedMultiplyFactor) + ')');
                        $('#dial-altitude').html(format.format('d')(location.z - deltaAltitude) + ' m (+' + format.format('d')(deltaAltitude) + ')');
                        $('#dial-heading').html(format.format('d')(heading) + '° (+' + format.format('d')(deltaHeading) + ')');
                        $('#dial-location-x').html(ConvertDDToDMS(geographic.x, true));
                        $('#dial-location-y').html(ConvertDDToDMS(geographic.y, false));
                    } else {
                        initialTime = time;
                    }

                    requestAnimationFrame(draw, location, speed, heading);
                }

                window.requestAnimationFrame(draw);

                $('#button-tilt-up').click(function () {
                    deltaTilt++;
                    //if (deltaTilt >= 360) {
                    //    deltaTilt -= 360;
                    //}
                });
                $('#button-tilt-dn').click(function () {
                    deltaTilt--;
                    //if (deltaTilt < 0) {
                    //    deltaTilt += 360;
                    //}
                });
                $('#button-speed-up').click(function () {
                    speedMultiplyFactor++;
                });
                $('#button-speed-dn').click(function () {
                    speedMultiplyFactor--;
                    if (speedMultiplyFactor < 1) {
                        speedMultiplyFactor = 1;
                    }
                });
                $('#button-altitude-up').click(function () {
                    deltaAltitude += 100;
                });
                $('#button-altitude-dn').click(function () {
                    deltaAltitude -= 100;
                    if (deltaAltitude < 0) {
                        deltaAltitude = 0;
                    }
                });
                $('#button-heading-up').click(function () {
                    deltaHeading += 1;
                    if (deltaHeading >= 360) {
                        deltaHeading -= 360;
                    }
                });
                $('#button-heading-dn').click(function () {
                    deltaHeading -= 1;
                    if (deltaHeading < 0) {
                        deltaHeading += 360;
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
    let lastTime = 0;
    const vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
            window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback, element) {
            const currTime = new Date().getTime();
            const timeToCall = Math.max(0, 16 - (currTime - lastTime));
            const id = window.setTimeout(function () { callback(currTime + timeToCall); }, timeToCall);
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
