// imports (hacky)

//L fit-curve: https://github.com/soswow/fit-curve
let fit;
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod);
        global.fitCurve = mod.exports;
    }
})(this, function (module) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    // ==ClosureCompiler==
    // @output_file_name fit-curve.min.js
    // @compilation_level SIMPLE_OPTIMIZATIONS
    // ==/ClosureCompiler==

    /**
     *  @preserve  JavaScript implementation of
     *  Algorithm for Automatically Fitting Digitized Curves
     *  by Philip J. Schneider
     *  "Graphics Gems", Academic Press, 1990
     *
     *  The MIT License (MIT)
     *
     *  https://github.com/soswow/fit-curves
     */

    /**
     * Fit one or more Bezier curves to a set of points.
     *
     * @param {Array<Array<Number>>} points - Array of digitized points, e.g. [[5,5],[5,50],[110,140],[210,160],[320,110]]
     * @param {Number} maxError - Tolerance, squared error between points and fitted curve
     * @returns {Array<Array<Array<Number>>>} Array of Bezier curves, where each element is [first-point, control-point-1, control-point-2, second-point] and points are [x, y]
     */
    function fitCurve(points, maxError, progressCallback) {
        if (!Array.isArray(points)) {
            throw new TypeError("First argument should be an array");
        }
        points.forEach(function (point) {
            if (!Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number') {
                throw Error("Each point should be an array of two numbers");
            }
        });
        // Remove duplicate points
        points = points.filter(function (point, i) {
            return i === 0 || !(point[0] === points[i - 1][0] && point[1] === points[i - 1][1]);
        });

        if (points.length < 2) {
            return [];
        }

        var len = points.length;
        var leftTangent = createTangent(points[1], points[0]);
        var rightTangent = createTangent(points[len - 2], points[len - 1]);

        return fitCubic(points, leftTangent, rightTangent, maxError, progressCallback);
    }

    /**
     * Fit a Bezier curve to a (sub)set of digitized points.
     * Your code should not call this function directly. Use {@link fitCurve} instead.
     *
     * @param {Array<Array<Number>>} points - Array of digitized points, e.g. [[5,5],[5,50],[110,140],[210,160],[320,110]]
     * @param {Array<Number>} leftTangent - Unit tangent vector at start point
     * @param {Array<Number>} rightTangent - Unit tangent vector at end point
     * @param {Number} error - Tolerance, squared error between points and fitted curve
     * @returns {Array<Array<Array<Number>>>} Array of Bezier curves, where each element is [first-point, control-point-1, control-point-2, second-point] and points are [x, y]
     */
    function fitCubic(points, leftTangent, rightTangent, error, progressCallback) {
        var MaxIterations = 20; //Max times to try iterating (to find an acceptable curve)

        var bezCurve, //Control points of fitted Bezier curve
        u, //Parameter values for point
        uPrime, //Improved parameter values
        maxError, prevErr, //Maximum fitting error
        splitPoint, prevSplit, //Point to split point set at if we need more than one curve
        centerVector, toCenterTangent, fromCenterTangent, //Unit tangent vector(s) at splitPoint
        beziers, //Array of fitted Bezier curves if we need more than one curve
        dist, i;

        //console.log('fitCubic, ', points.length);

        //Use heuristic if region only has two points in it
        if (points.length === 2) {
            dist = maths.vectorLen(maths.subtract(points[0], points[1])) / 3.0;
            bezCurve = [points[0], maths.addArrays(points[0], maths.mulItems(leftTangent, dist)), maths.addArrays(points[1], maths.mulItems(rightTangent, dist)), points[1]];
            return [bezCurve];
        }

        //Parameterize points, and attempt to fit curve
        u = chordLengthParameterize(points);

        var _generateAndReport = generateAndReport(points, u, u, leftTangent, rightTangent, progressCallback);

        bezCurve = _generateAndReport[0];
        maxError = _generateAndReport[1];
        splitPoint = _generateAndReport[2];


        if (maxError < error) {
            return [bezCurve];
        }
        //If error not too large, try some reparameterization and iteration
        if (maxError < error * error) {

            uPrime = u;
            prevErr = maxError;
            prevSplit = splitPoint;

            for (i = 0; i < MaxIterations; i++) {

                uPrime = reparameterize(bezCurve, points, uPrime);

                var _generateAndReport2 = generateAndReport(points, u, uPrime, leftTangent, rightTangent, progressCallback);

                bezCurve = _generateAndReport2[0];
                maxError = _generateAndReport2[1];
                splitPoint = _generateAndReport2[2];


                if (maxError < error) {
                    return [bezCurve];
                }
                //If the development of the fitted curve grinds to a halt,
                //we abort this attempt (and try a shorter curve):
                else if (splitPoint === prevSplit) {
                        var errChange = maxError / prevErr;
                        if (errChange > .9999 && errChange < 1.0001) {
                            break;
                        }
                    }

                prevErr = maxError;
                prevSplit = splitPoint;
            }
        }

        //Fitting failed -- split at max error point and fit recursively
        beziers = [];

        //To create a smooth transition from one curve segment to the next,
        //we calculate the tangent of the points directly before and after the center,
        //and use that same tangent both to and from the center point.
        centerVector = maths.subtract(points[splitPoint - 1], points[splitPoint + 1]);
        //However, should those two points be equal, the normal tangent calculation will fail.
        //Instead, we calculate the tangent from that "double-point" to the center point, and rotate 90deg.
        if (centerVector[0] === 0 && centerVector[1] === 0) {
            //toCenterTangent = createTangent(points[splitPoint - 1], points[splitPoint]);
            //fromCenterTangent = createTangent(points[splitPoint + 1], points[splitPoint]);

            //[x,y] -> [-y,x]: http://stackoverflow.com/a/4780141/1869660
            centerVector = maths.subtract(points[splitPoint - 1], points[splitPoint]).reverse();
            centerVector[0] = -centerVector[0];
        }
        toCenterTangent = maths.normalize(centerVector);
        //To and from need to point in opposite directions:
        fromCenterTangent = maths.mulItems(toCenterTangent, -1);

        /*
        Note: An alternative to this "divide and conquer" recursion could be to always
              let new curve segments start by trying to go all the way to the end,
              instead of only to the end of the current subdivided polyline.
              That might let many segments fit a few points more, reducing the number of total segments.
                However, a few tests have shown that the segment reduction is insignificant
              (240 pts, 100 err: 25 curves vs 27 curves. 140 pts, 100 err: 17 curves on both),
              and the results take twice as many steps and milliseconds to finish,
              without looking any better than what we already have.
        */
        beziers = beziers.concat(fitCubic(points.slice(0, splitPoint + 1), leftTangent, toCenterTangent, error, progressCallback));
        beziers = beziers.concat(fitCubic(points.slice(splitPoint), fromCenterTangent, rightTangent, error, progressCallback));
        return beziers;
    };

    function generateAndReport(points, paramsOrig, paramsPrime, leftTangent, rightTangent, progressCallback) {
        var bezCurve, maxError, splitPoint;

        bezCurve = generateBezier(points, paramsPrime, leftTangent, rightTangent, progressCallback);
        //Find max deviation of points to fitted curve.
        //Here we always use the original parameters (from chordLengthParameterize()),
        //because we need to compare the current curve to the actual source polyline,
        //and not the currently iterated parameters which reparameterize() & generateBezier() use,
        //as those have probably drifted far away and may no longer be in ascending order.

        var _computeMaxError = computeMaxError(points, bezCurve, paramsOrig);

        maxError = _computeMaxError[0];
        splitPoint = _computeMaxError[1];


        if (progressCallback) {
            progressCallback({
                bez: bezCurve,
                points: points,
                params: paramsOrig,
                maxErr: maxError,
                maxPoint: splitPoint
            });
        }

        return [bezCurve, maxError, splitPoint];
    }

    /**
     * Use least-squares method to find Bezier control points for region.
     *
     * @param {Array<Array<Number>>} points - Array of digitized points
     * @param {Array<Number>} parameters - Parameter values for region
     * @param {Array<Number>} leftTangent - Unit tangent vector at start point
     * @param {Array<Number>} rightTangent - Unit tangent vector at end point
     * @returns {Array<Array<Number>>} Approximated Bezier curve: [first-point, control-point-1, control-point-2, second-point] where points are [x, y]
     */
    function generateBezier(points, parameters, leftTangent, rightTangent) {
        var bezCurve,
            //Bezier curve ctl pts
        A,
            a,
            //Precomputed rhs for eqn
        C,
            X,
            //Matrices C & X
        det_C0_C1,
            det_C0_X,
            det_X_C1,
            //Determinants of matrices
        alpha_l,
            alpha_r,
            //Alpha values, left and right

        epsilon,
            segLength,
            i,
            len,
            tmp,
            u,
            ux,
            firstPoint = points[0],
            lastPoint = points[points.length - 1];

        bezCurve = [firstPoint, null, null, lastPoint];
        //console.log('gb', parameters.length);

        //Compute the A's
        A = maths.zeros_Xx2x2(parameters.length);
        for (i = 0, len = parameters.length; i < len; i++) {
            u = parameters[i];
            ux = 1 - u;
            a = A[i];

            a[0] = maths.mulItems(leftTangent, 3 * u * (ux * ux));
            a[1] = maths.mulItems(rightTangent, 3 * ux * (u * u));
        }

        //Create the C and X matrices
        C = [[0, 0], [0, 0]];
        X = [0, 0];
        for (i = 0, len = points.length; i < len; i++) {
            u = parameters[i];
            a = A[i];

            C[0][0] += maths.dot(a[0], a[0]);
            C[0][1] += maths.dot(a[0], a[1]);
            C[1][0] += maths.dot(a[0], a[1]);
            C[1][1] += maths.dot(a[1], a[1]);

            tmp = maths.subtract(points[i], bezier.q([firstPoint, firstPoint, lastPoint, lastPoint], u));

            X[0] += maths.dot(a[0], tmp);
            X[1] += maths.dot(a[1], tmp);
        }

        //Compute the determinants of C and X
        det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
        det_C0_X = C[0][0] * X[1] - C[1][0] * X[0];
        det_X_C1 = X[0] * C[1][1] - X[1] * C[0][1];

        //Finally, derive alpha values
        alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
        alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;

        //If alpha negative, use the Wu/Barsky heuristic (see text).
        //If alpha is 0, you get coincident control points that lead to
        //divide by zero in any subsequent NewtonRaphsonRootFind() call.
        segLength = maths.vectorLen(maths.subtract(firstPoint, lastPoint));
        epsilon = 1.0e-6 * segLength;
        if (alpha_l < epsilon || alpha_r < epsilon) {
            //Fall back on standard (probably inaccurate) formula, and subdivide further if needed.
            bezCurve[1] = maths.addArrays(firstPoint, maths.mulItems(leftTangent, segLength / 3.0));
            bezCurve[2] = maths.addArrays(lastPoint, maths.mulItems(rightTangent, segLength / 3.0));
        } else {
            //First and last control points of the Bezier curve are
            //positioned exactly at the first and last data points
            //Control points 1 and 2 are positioned an alpha distance out
            //on the tangent vectors, left and right, respectively
            bezCurve[1] = maths.addArrays(firstPoint, maths.mulItems(leftTangent, alpha_l));
            bezCurve[2] = maths.addArrays(lastPoint, maths.mulItems(rightTangent, alpha_r));
        }

        return bezCurve;
    };

    /**
     * Given set of points and their parameterization, try to find a better parameterization.
     *
     * @param {Array<Array<Number>>} bezier - Current fitted curve
     * @param {Array<Array<Number>>} points - Array of digitized points
     * @param {Array<Number>} parameters - Current parameter values
     * @returns {Array<Number>} New parameter values
     */
    function reparameterize(bezier, points, parameters) {
        /*
        var j, len, point, results, u;
        results = [];
        for (j = 0, len = points.length; j < len; j++) {
            point = points[j], u = parameters[j];
              results.push(newtonRaphsonRootFind(bezier, point, u));
        }
        return results;
        //*/
        return parameters.map(function (p, i) {
            return newtonRaphsonRootFind(bezier, points[i], p);
        });
    };

    /**
     * Use Newton-Raphson iteration to find better root.
     *
     * @param {Array<Array<Number>>} bez - Current fitted curve
     * @param {Array<Number>} point - Digitized point
     * @param {Number} u - Parameter value for "P"
     * @returns {Number} New u
     */
    function newtonRaphsonRootFind(bez, point, u) {
        /*
            Newton's root finding algorithm calculates f(x)=0 by reiterating
            x_n+1 = x_n - f(x_n)/f'(x_n)
            We are trying to find curve parameter u for some point p that minimizes
            the distance from that point to the curve. Distance point to curve is d=q(u)-p.
            At minimum distance the point is perpendicular to the curve.
            We are solving
            f = q(u)-p * q'(u) = 0
            with
            f' = q'(u) * q'(u) + q(u)-p * q''(u)
            gives
            u_n+1 = u_n - |q(u_n)-p * q'(u_n)| / |q'(u_n)**2 + q(u_n)-p * q''(u_n)|
        */

        var d = maths.subtract(bezier.q(bez, u), point),
            qprime = bezier.qprime(bez, u),
            numerator = /*sum(*/maths.mulMatrix(d, qprime) /*)*/
        ,
            denominator = maths.sum(maths.addItems(maths.squareItems(qprime), maths.mulMatrix(d, bezier.qprimeprime(bez, u))));

        if (denominator === 0) {
            return u;
        } else {
            return u - numerator / denominator;
        }
    };

    /**
     * Assign parameter values to digitized points using relative distances between points.
     *
     * @param {Array<Array<Number>>} points - Array of digitized points
     * @returns {Array<Number>} Parameter values
     */
    function chordLengthParameterize(points) {
        var u = [],
            currU,
            prevU,
            prevP;

        points.forEach(function (p, i) {
            currU = i ? prevU + maths.vectorLen(maths.subtract(p, prevP)) : 0;
            u.push(currU);

            prevU = currU;
            prevP = p;
        });
        u = u.map(function (x) {
            return x / prevU;
        });

        return u;
    };

    /**
     * Find the maximum squared distance of digitized points to fitted curve.
     *
     * @param {Array<Array<Number>>} points - Array of digitized points
     * @param {Array<Array<Number>>} bez - Fitted curve
     * @param {Array<Number>} parameters - Parameterization of points
     * @returns {Array<Number>} Maximum error (squared) and point of max error
     */
    function computeMaxError(points, bez, parameters) {
        var dist, //Current error
        maxDist, //Maximum error
        splitPoint, //Point of maximum error
        v, //Vector from point to curve
        i, count, point, t;

        maxDist = 0;
        splitPoint = points.length / 2;

        var t_distMap = mapTtoRelativeDistances(bez, 10);

        for (i = 0, count = points.length; i < count; i++) {
            point = points[i];
            //Find 't' for a point on the bez curve that's as close to 'point' as possible:
            t = find_t(bez, parameters[i], t_distMap, 10);

            v = maths.subtract(bezier.q(bez, t), point);
            dist = v[0] * v[0] + v[1] * v[1];

            if (dist > maxDist) {
                maxDist = dist;
                splitPoint = i;
            }
        }

        return [maxDist, splitPoint];
    };

    //Sample 't's and map them to relative distances along the curve:
    var mapTtoRelativeDistances = function mapTtoRelativeDistances(bez, B_parts) {
        var B_t_curr;
        var B_t_dist = [0];
        var B_t_prev = bez[0];
        var sumLen = 0;

        for (var i = 1; i <= B_parts; i++) {
            B_t_curr = bezier.q(bez, i / B_parts);

            sumLen += maths.vectorLen(maths.subtract(B_t_curr, B_t_prev));

            B_t_dist.push(sumLen);
            B_t_prev = B_t_curr;
        }

        //Normalize B_length to the same interval as the parameter distances; 0 to 1:
        B_t_dist = B_t_dist.map(function (x) {
            return x / sumLen;
        });
        return B_t_dist;
    };

    function find_t(bez, param, t_distMap, B_parts) {
        if (param < 0) {
            return 0;
        }
        if (param > 1) {
            return 1;
        }

        /*
            'param' is a value between 0 and 1 telling us the relative position
            of a point on the source polyline (linearly from the start (0) to the end (1)).
            To see if a given curve - 'bez' - is a close approximation of the polyline,
            we compare such a poly-point to the point on the curve that's the same
            relative distance along the curve's length.
              But finding that curve-point takes a little work:
            There is a function "B(t)" to find points along a curve from the parametric parameter 't'
            (also relative from 0 to 1: http://stackoverflow.com/a/32841764/1869660
                                        http://pomax.github.io/bezierinfo/#explanation),
            but 't' isn't linear by length (http://gamedev.stackexchange.com/questions/105230).
              So, we sample some points along the curve using a handful of values for 't'.
            Then, we calculate the length between those samples via plain euclidean distance;
            B(t) concentrates the points around sharp turns, so this should give us a good-enough outline of the curve.
            Thus, for a given relative distance ('param'), we can now find an upper and lower value
            for the corresponding 't' by searching through those sampled distances.
            Finally, we just use linear interpolation to find a better value for the exact 't'.
              More info:
                http://gamedev.stackexchange.com/questions/105230/points-evenly-spaced-along-a-bezier-curve
                http://stackoverflow.com/questions/29438398/cheap-way-of-calculating-cubic-bezier-length
                http://steve.hollasch.net/cgindex/curves/cbezarclen.html
                https://github.com/retuxx/tinyspline
        */
        var lenMax, lenMin, tMax, tMin, t;

        //Find the two t-s that the current param distance lies between,
        //and then interpolate a somewhat accurate value for the exact t:
        for (var i = 1; i <= B_parts; i++) {

            if (param <= t_distMap[i]) {
                tMin = (i - 1) / B_parts;
                tMax = i / B_parts;
                lenMin = t_distMap[i - 1];
                lenMax = t_distMap[i];

                t = (param - lenMin) / (lenMax - lenMin) * (tMax - tMin) + tMin;
                break;
            }
        }
        return t;
    }

    /**
     * Creates a vector of length 1 which shows the direction from B to A
     */
    function createTangent(pointA, pointB) {
        return maths.normalize(maths.subtract(pointA, pointB));
    }

    /*
        Simplified versions of what we need from math.js
        Optimized for our input, which is only numbers and 1x2 arrays (i.e. [x, y] coordinates).
    */

    var maths = function () {
        function maths() {
            _classCallCheck(this, maths);
        }

        maths.zeros_Xx2x2 = function zeros_Xx2x2(x) {
            var zs = [];
            while (x--) {
                zs.push([0, 0]);
            }
            return zs;
        };

        maths.mulItems = function mulItems(items, multiplier) {
            //return items.map(x => x*multiplier);
            return [items[0] * multiplier, items[1] * multiplier];
        };

        maths.mulMatrix = function mulMatrix(m1, m2) {
            //https://en.wikipedia.org/wiki/Matrix_multiplication#Matrix_product_.28two_matrices.29
            //Simplified to only handle 1-dimensional matrices (i.e. arrays) of equal length:
            //  return m1.reduce((sum,x1,i) => sum + (x1*m2[i]),
            //                   0);
            return m1[0] * m2[0] + m1[1] * m2[1];
        };

        maths.subtract = function subtract(arr1, arr2) {
            //return arr1.map((x1, i) => x1 - arr2[i]);
            return [arr1[0] - arr2[0], arr1[1] - arr2[1]];
        };

        maths.addArrays = function addArrays(arr1, arr2) {
            //return arr1.map((x1, i) => x1 + arr2[i]);
            return [arr1[0] + arr2[0], arr1[1] + arr2[1]];
        };

        maths.addItems = function addItems(items, addition) {
            //return items.map(x => x+addition);
            return [items[0] + addition, items[1] + addition];
        };

        maths.sum = function sum(items) {
            return items.reduce(function (sum, x) {
                return sum + x;
            });
        };

        maths.dot = function dot(m1, m2) {
            return maths.mulMatrix(m1, m2);
        };

        maths.vectorLen = function vectorLen(v) {
            var a = v[0],
                b = v[1];
            return Math.sqrt(a * a + b * b);
        };

        maths.divItems = function divItems(items, divisor) {
            //return items.map(x => x/divisor);
            return [items[0] / divisor, items[1] / divisor];
        };

        maths.squareItems = function squareItems(items) {
            //return items.map(x => x*x);
            var a = items[0],
                b = items[1];
            return [a * a, b * b];
        };

        maths.normalize = function normalize(v) {
            return this.divItems(v, this.vectorLen(v));
        };

        return maths;
    }();

    var bezier = function () {
        function bezier() {
            _classCallCheck(this, bezier);
        }

        bezier.q = function q(ctrlPoly, t) {
            var tx = 1.0 - t;
            var pA = maths.mulItems(ctrlPoly[0], tx * tx * tx),
                pB = maths.mulItems(ctrlPoly[1], 3 * tx * tx * t),
                pC = maths.mulItems(ctrlPoly[2], 3 * tx * t * t),
                pD = maths.mulItems(ctrlPoly[3], t * t * t);
            return maths.addArrays(maths.addArrays(pA, pB), maths.addArrays(pC, pD));
        };

        bezier.qprime = function qprime(ctrlPoly, t) {
            var tx = 1.0 - t;
            var pA = maths.mulItems(maths.subtract(ctrlPoly[1], ctrlPoly[0]), 3 * tx * tx),
                pB = maths.mulItems(maths.subtract(ctrlPoly[2], ctrlPoly[1]), 6 * tx * t),
                pC = maths.mulItems(maths.subtract(ctrlPoly[3], ctrlPoly[2]), 3 * t * t);
            return maths.addArrays(maths.addArrays(pA, pB), pC);
        };

        bezier.qprimeprime = function qprimeprime(ctrlPoly, t) {
            return maths.addArrays(maths.mulItems(maths.addArrays(maths.subtract(ctrlPoly[2], maths.mulItems(ctrlPoly[1], 2)), ctrlPoly[0]), 6 * (1.0 - t)), maths.mulItems(maths.addArrays(maths.subtract(ctrlPoly[3], maths.mulItems(ctrlPoly[2], 2)), ctrlPoly[1]), 6 * t));
        };

        return bezier;
    }();

   	fit = fitCurve;
});

//L equation: https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Cubic_B.C3.A9zier_curves
//L explanation: https://medium.freecodecamp.org/nerding-out-with-bezier-curves-6e3c0bc48e2f



// constants
const width = 1500;
const height = 500;

// util
function setAttributes(element, attributes) {
  for(let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}
function setAttributesNS(element, namespace, attributes) {
  for(let key in attributes) {
    element.setAttributeNS(namespace, key, attributes[key]);
  }
}

//L	https://www.sitepoint.com/dom-manipulation-vanilla-javascript-no-jquery/

// svg
let ns = 'http://www.w3.org/2000/svg'; // svg namespace
let svg = document.createElementNS(ns, 'svg'); // svg requires a namespace via createElementNS(ns, ...)
setAttributesNS(svg, null, { // attributes inherit namespace of tag, but themselves don't have namespaces (prefixes), therefore namespace is null
  width: width,
  height: height,
});
//document.getElementById("grid-drawing").appendChild(svg);
document.body.appendChild(svg);

// border
let b = document.createElementNS(ns, 'rect');
setAttributesNS(b, null, {
	x: 0,
	y: 0,
	width: width,
	height: height,
	class: 'border',
});
svg.appendChild(b);


/* controller example
	let c = document.createElementNS(ns, 'circle');
	setAttributesNS(c, null, {
		cx: 50,
		cy: 50,
		r: 50,
		fill: 'red',
	});
	svg.appendChild(c);

	// create controls
	let form = document.createElement("form");

	let input1 = document.createElement("input");
	let input2 = document.createElement("input");
	setAttributes(input1, {
	type: 'range',
	min: 0,
	max: width,
	value: width/2,
	oninput: `moveSlider(this, 'x')`,
	});
	setAttributes(input2, {
	type: 'range',
	min: 0,
	max: height,
	value: height/2,
	oninput: `moveSlider(this, 'y')`,
	});
	form.appendChild(input1);
	form.appendChild(input2);

	document.body.appendChild(form);

	// sliders
	let moveSlider = function(slider, direction) {
	c.setAttributeNS(null, "c" + direction, slider.value);
	}
*/

// creation
function createRandomLine() {
	// random float from 0-inclusive to 1-exclusive * range+1 then floored
	let l = [
		{
			x: Math.floor(Math.random() * (width+1)),
			y: Math.floor(Math.random() * (height+1)),
		},
		{
			x: Math.floor(Math.random() * (width+1)),
			y: Math.floor(Math.random() * (height+1)),
		},
	];
	
	/* testing
		let ps = lineToPoints(a[i]);
		console.log(ps);

		let l = getLength(ps[0], ps[1]);
		let v = getVector(ps[0], ps[1]);
		let n = normalizeVector(v);
		console.log(getLength({x: 0, y:0}, n));

		if(i >=1) {
		createCommonLine(lineToPoints(a[i-1]), lineToPoints(a[i]));
	}
	*/
	return l;
}
function createCommonLine(l1, l2) {
	// employ aggregate method
	//TODO use study's actual method (section 5)
	//! temporary method (just for lines): simple end-point averaging

	// existing order
	l1e = getVector(l1[0], l1[1]);
	l2e = getVector(l2[0], l2[1]);
	// reversed order
	l2r = getVector(l2[1], l2[0]);

	// if angle between lines is smaller by switching the order of the points of one line
	if (angleBetweenVectors(l1e, l2e) > angleBetweenVectors(l1e, l2r)) {
		// reverse points of line 2
		[l2[0], l2[1]] = [l2[1], l2[0]];
	}

	// average endpoints and create line
	l3 = [
		{x: (l1[0].x + l2[0].x) /2, y: (l1[0].y + l2[0].y) /2},
		{x: (l1[1].x + l2[1].x) /2, y: (l1[1].y + l2[1].y) /2},
	];
	return l3;
}
function createCommonPolyline(polylines, n) {
	//! still our own method, because the study's method is complicated af and we're running out of time

	// orient all lines the same way (highest angular compatibility)
	for (let i = 0; i < polylines.length; i++) {
		// for each polyline, count if its angular compatibility is better if it's same or inverted orientation relative to all other lines (except itself, which is why sameCount starts at -1)
		let sameCount = -1;
		let invertCount = 0;
		for (let j = 0; j < polylines.length; j++) {
			if (angularCompatibility(polylines[i], polylines[j]) < angularCompatibility(polylines[i], polylines[j])) {
				sameCount++;
			} else {
				invertCount++;
			}
			polylines[i].reverse();
		}

		// if its mostly better when inverted, invert it
		if (invertCount > sameCount) {
			polylines[i].reverse();
		}
	}

	let fittedCurves = [];
	polylines.forEach((polyline, i) => {
		fittedCurves[i] = fitPolyline(polyline, fitForgiveness);
	});
	
	let distributedPointsList = [];
	fittedCurves.forEach((fittedCurve, i) => {
		distributedPointsList[i] = getDistributedPoints(fittedCurve, n);
	});

	/* old
		// if angle between lines is smaller by switching the order of the points of one line
		if (angularCompatibility(pl1, pl2) > angularCompatibility(pl1, pl2.reverse())) {
			// reverse points of polyline 2
			//! this is already reversed as part of the calculation
		} else {
			//! un-reverse it if its proper
			pl2.reverse();
		}

		let fc1 = fitPolyline(pl1, fitForgiveness);
		let fc2 = fitPolyline(pl2, fitForgiveness);

		let dp1 = getDistributedPoints(fc1, n);
		let dp2 = getDistributedPoints(fc2, n);
		
		// average points
		let dp3 = [];
		for (let i = 0; i < dp1.length; i++) {
			dp3[i] = {
				x: (dp1[i].x + dp2[i].x) / 2,
				y: (dp1[i].y + dp2[i].y) / 2,
			};
		}
	*/

	let cdp = []; // common distributed points
	for (let i = 0; i < n+1; i++) {
		// average
		cdp[i] = {x: 0, y: 0};
		distributedPointsList.forEach(distributedPoints => {
			cdp[i].x += distributedPoints[i].x;
			cdp[i].y += distributedPoints[i].y;
		});
		cdp[i].x = cdp[i].x / distributedPointsList.length;
		cdp[i].y = cdp[i].y / distributedPointsList.length;
	}

	return cdp;
}
function fitPolyline(polyline, forgiveness) {
	// convert point objects to point arrays
	let pointArray = [];
	polyline.forEach(point => {
		pointArray.push([point.x, point.y]);
	});

	// do it	https://www.youtube.com/watch?v=BkIJsnLBA4c
	let fittedCurve = fit(pointArray, forgiveness);

	// convert point arrays back into objects
	fittedCurve.forEach(curve => {
		curve.forEach((point, i) => {
			curve[i] = {x: point[0], y: point[1]};
		});
	});

	return fittedCurve;
}
function averagePoints(points) {
	let avg = {x: 0, y: 0};
	for (let i = 0; i < points.length; i++) {
		avg.x += points[i].x;
		avg.y += points[i].y;
	}

	avg.x = avg.x / points.length;
	avg.y = avg.y / points.length;

	return avg;
}
function angularCompatibility(pl1, pl2) {
	// get orientation of lines correct
	let firstHalf1 = [];
	let secondHalf1 = [];
	for (let i = 0; i < pl1.length; i++) {
		if (i < Math.ceil(pl1.length/2)) {
			firstHalf1.push(pl1[i]);
		} else {
			secondHalf1.push(pl1[i]);
		}
	}
	let firstPoint1 = averagePoints(firstHalf1);
	let secondPoint1 = averagePoints(secondHalf1);
	let l1e = getVector(firstPoint1, secondPoint1);
	
	let firstHalf2 = [];
	let secondHalf2 = [];
	for (let i = 0; i < pl2.length; i++) {
		if (i < Math.ceil(pl2.length/2)) {
			firstHalf2.push(pl2[i]);
		} else {
			secondHalf2.push(pl2[i]);
		}
	}
	let firstPoint2 = averagePoints(firstHalf2);
	let secondPoint2 = averagePoints(secondHalf2);
	let l2e = getVector(firstPoint2, secondPoint2);

	return angleBetweenVectors(l1e, l2e);
}
function distanceBetweenPolylines(pl1, pl2, detail) {
	// re-analyze polylines to have same number of points
	pl1 = getDistributedPoints(fitPolyline(pl1, fitForgiveness), detail);
	pl2 = getDistributedPoints(fitPolyline(pl2, fitForgiveness), detail);

	// get average distance
	let sum = 0;
	for(let i = 0; i < pl1.length; i++) {
		sum += getDistance(pl1[i], pl2[i]);
	}
	return sum / pl1.length;
}
function coarseMerge(polylines) {
	let instance = [];
	for (let i = 0; i < polylines.length; i++) {
		instance.push(polylines[i].slice(0));
	}

	let groups = [];

	for (let i = instance.length-1; i > -1; i--) {
		// for each polyline, that hasn't been grouped yet
		if (instance[i] !== 'grouped') {
			// create a new group (in groups) at i, containing polyline[i]
			groups[i] = [instance[i].slice(0)];
			instance[i] = 'grouped';

			for (let j = i-1; j > -1; j--) {
				// then iterate over all other ungrouped polylines, and if they satisfy the thresholds
				console.log('Angular Compat: ', angularCompatibility(groups[i][0], instance[j]));
				console.log('Distance: ', distanceBetweenPolylines(groups[i][0], instance[j]));
				if (angularCompatibility(groups[i][0], instance[j]) < angularCompatibilityThreshold && distanceBetweenPolylines(groups[i][0], instance[j]) < distanceThreshold) {
					// group them with that group
					
					groups[i].push(instance[j].slice(0));
					instance[j] = 'grouped';
				}
			}
		}
	}

	let newPolylines = [];
	groups.forEach(item => {
		if (Array.isArray(item)) {
			newPolylines.push(createCommonPolyline(item, 50));
		}
	});

	return newPolylines;;
}

// math
const fitForgiveness = 5;
const estimateDivisions = 10;

const angularCompatibilityThreshold = 0.5;
const distanceThreshold = 1000; // this is the big thing keeping it from working well - parallel but end-to-end lines are technically far apart which isnt right

function getDistance({x: x1, y: y1}, {x: x2, y: y2}) {
	// length between two points
	return Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 0.5);
}
function getLength({x, y}) {
	// length of hypotenuse of vector
	return Math.pow(Math.pow(x, 2) + Math.pow(y, 2), 0.5);
}
function getVector({x: x1, y: y1}, {x: x2, y: y2}) {
	// from point 1 to point 2
	return {x: x2 - x1, y: y2 - y1};
}
function normalizeVector(v) {
	// length will be 1
	let m = getLength(v);
	return {x: v.x/m, y: v.y/m};
}
function angleBetweenVectors(v1, v2) {
	// smallest angle between vectors
	let dot = (v1.x * v2.x) + (v1.y * v2.y);
	let m1 = getLength(v1);
	let m2 = getLength(v2);
	return Math.acos(dot / (m1 * m2));
}
function estimateTangent(polyline, index) {
	// indexes of neighboring points
	let before = index - 1;
	let after = index + 1;

	// clamp
	if (before < 0) before = 0;
	if (after > polyline.length-1) after = polyline.length-1;

	return normalizeVector(getVector(polyline[index-1], polyline[index+1]));
}

function pointAlongCubic(cubic, t) {
	// cubic[0&3] are the anchor points, cubic[1&2] are the control points
	// t is how far along the curve the point is 0-1
	// equation is a cubic curve

	// clamp
	if (t > 1) {
		t = 1;
	} else if (t < 0) {
		t = 0;
	}

	// inverse
	let ti = 1 - t;

	// set default point
	let p = {
		x: cubic[0].x, 
		y: cubic[0].y
	};

	// cubic function
	p.x = 
		1*Math.pow(ti, 3)*Math.pow(t, 0)*cubic[0].x + 
		3*Math.pow(ti, 2)*Math.pow(t, 1)*cubic[1].x + 
		3*Math.pow(ti, 1)*Math.pow(t, 2)*cubic[2].x + 
		1*Math.pow(ti, 0)*Math.pow(t, 3)*cubic[3].x;

	p.y = 
		1*Math.pow(ti, 3)*Math.pow(t, 0)*cubic[0].y + 
		3*Math.pow(ti, 2)*Math.pow(t, 1)*cubic[1].y + 
		3*Math.pow(ti, 1)*Math.pow(t, 2)*cubic[2].y + 
		1*Math.pow(ti, 0)*Math.pow(t, 3)*cubic[3].y;

	return p;
}
function estimateCubicLength(cubic, divisions) {
	// get dividing points
	let dividingPoints = [];
	for(let i = 0; i <= divisions; i++) {
		dividingPoints.push(pointAlongCubic(cubic, i/divisions));
	}

	// sum division lengths
	let length = 0;
	for(let i = 1; i < dividingPoints.length; i++) {
		length += getDistance(dividingPoints[i-1], dividingPoints[i]);
	}
	
	return length;
}
function estimateFittedCurveLength(fittedCurve, divisions) {
	let length = 0;
	fittedCurve.forEach(curve => {
		length += estimateCubicLength(curve, divisions);
	});

	return length;
}
function getDistributedPoints(fittedCurve, n) {
	// get the lengths of each component cubic
	let cubicLengths = [];
	fittedCurve.forEach(cubic => {
		cubicLengths.push(estimateCubicLength(cubic, estimateDivisions));
	});

	// get the length of the entire fitted curve
	let divisionLength = estimateFittedCurveLength(fittedCurve, estimateDivisions) / n;

	// for each point
	let points = [];
	for (let i = 0; i < n; i++) {
		// get the estimated point length
		let pointLength = i * divisionLength;

		// find which cubic the point falls into
		let respectiveCubic = 0;
		let combinedLengths = 0;
		for (let j = 0; j < cubicLengths.length; j++) {
			combinedLengths += cubicLengths[j];
			// if the combined lengths goes from less to more than the distance of the point
			if (combinedLengths > pointLength) {
				// set the respective cubic as this cubic, undo that last addition, and stop
				respectiveCubic = j;
				combinedLengths -= cubicLengths[j];
				break;
			}
		}
		
		// find how far along the respectiveCubic the point is
		let t = (pointLength - combinedLengths) / cubicLengths[respectiveCubic];

		// find the coordinates of this point
		points.push(pointAlongCubic(fittedCurve[respectiveCubic], t));
	}

	// finally add the last point
	let lastCubic = fittedCurve[fittedCurve.length-1];
	let lastPoint = lastCubic[lastCubic.length-1];
	points.push(lastPoint);

	return points;
}

// backwards conversion
function lineToPoints(line) {
	let x1, y1, x2, y2;
	try {
		x1 = parseFloat(line.getAttributeNS(null, 'x1'));
		y1 = parseFloat(line.getAttributeNS(null, 'y1'));
		x2 = parseFloat(line.getAttributeNS(null, 'x2'));
		y2 = parseFloat(line.getAttributeNS(null, 'y2'));
	} catch (e) {
		console.error(e);
		return [
			{x: 0, y: 0},
			{x: 0, y: 0},
		];
	}

	return [
		{x: x1, y: y1},
		{x: x2, y: y2},
	];
}

// buttons
function generateFunction() {
	for (let i = 0; i < 2; i++) {
		let rl = createRandomLine();
		let l = document.createElementNS(ns, 'line');
		setAttributesNS(l, null, {
			x1: rl[0].x,
			y1: rl[0].y,
			x2: rl[1].x,
			y2: rl[1].y,
			class: 'lineA',
		});
		svg.appendChild(l);
	}
}
function cleanFunction() {
	/* old
		let lines = svg.getElementsByTagName('line');

		// convert
		let lines2 = [];
		for(let i = 0; i < lines.length; i++) {
			lines2[i] = lineToPoints(lines[i]);
		}

		for(let i = 0; i < lines2.length; i++) {
			for(let j = i + 1; j < lines2.length; j++) {
				// for each unique pair of lines
				let cl = createCommonLine(lines2[i], lines2[j]);
				let l = document.createElementNS(ns, 'line');
				setAttributesNS(l, null, {
					x1: cl[0].x,
					y1: cl[0].y,
					x2: cl[1].x,
					y2: cl[1].y,
					class: 'lineB',
				});
				svg.appendChild(l);
			}
		}
	*/

	drawnPolylines.forEach((polyline, i) => {
		let fittedCurve = fitPolyline(polyline, 10);
		drawFittedCurve(fittedCurve, 'lineA');

		/* create distributed points
			let distributedPoints = getDistributedPoints(fittedCurve, 100);
			drawDistributedPoints(distributedPoints, 'fillA');
		*/
	});

	
	let aggregatedPolylines = coarseMerge(drawnPolylines);
	aggregatedPolylines.forEach(polyline => {
		let fittedCurve = fitPolyline(polyline, 10);
		drawFittedCurve(fittedCurve, 'lineA');
	});
	

	/* old
		let commonDistributedPoints = [];

		for (let i = 0; i < drawnPolylines.length; i++) {
			for (let j = i + 1; j < drawnPolylines.length; j++) {
				let commonPolyline = createCommonPolyline([drawnPolylines[i], drawnPolylines[j]], 100);
				commonDistributedPoints.push(commonPolyline);
				commonPolyline.forEach(point => {
					drawDot(point, 'fillA');
				});
			}
		}
	*/
}
function deleteFunction() {
	// https://developer.mozilla.org/en-US/docs/Web/API/Node
	//TODO only delete lines
	let lines = svg.getElementsByTagName('line');
	for (let i = lines.length - 1; i >= 0; i--) {
		lines[i].remove();
	}

	let paths = svg.getElementsByTagName('path');
	for (let i = paths.length - 1; i >= 0; i--) {
		paths[i].remove();
	}

	let circles = svg.getElementsByTagName('circle');
	for (let i = circles.length - 1; i >= 0; i--) {
		circles[i].remove();
	}

	// clear storage
	drawnPolylines = [];
}

// draw functions
function drawLine([p1, p2], style) {
	let temp = document.createElementNS(ns, 'line');
	setAttributesNS(temp, null, {
		x1: p1.x,
		y1: p1.y,
		x2: p2.x,
		y2: p2.y,
		class: style,
	});
	svg.appendChild(temp);
	return temp;
}
function drawCubic([p1, p2, p3, p4], style) {
	let temp = document.createElementNS(ns, 'path');
	setAttributesNS(temp, null, {
		d: `M ${p1.x} ${p1.y} C ${p2.x} ${p2.y}, ${p3.x} ${p3.y}, ${p4.x} ${p4.y}`,
		class: style,
	});
	svg.appendChild(temp);
	return temp;
}
function drawFittedCurve(fittedCurve, style) {
	fittedCurve.forEach(cubic => {
		// store on first point (?)
		cubic[0].cubic = drawCubic(cubic, style);
	});
}
function drawDot(p, style) {
	let temp = document.createElementNS(ns, 'circle');
	setAttributesNS(temp, null, {
		cx: p.x,
		cy: p.y,
		r: 10,
		class: style,
	});
	svg.appendChild(temp);
	return temp;
}
function drawDistributedPoints(distributedPoints, style) {
	distributedPoints.forEach(point => {
		drawDot(point, style);
	});
}

//L mouseevent https://stackoverflow.com/questions/10298658/mouse-position-inside-autoscaled-svg
//L https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/

function getLocation(event){
	// gets point in global SVG space //! might be an issue if the svg is scaled

	// create an 'SVGPoint'
	let p = svg.createSVGPoint();
	p.x = event.clientX;
	p.y = event.clientY;
	// use builtin matrix math
	return p.matrixTransform(svg.getScreenCTM().inverse());
}

let mousePosition = {x: 0, y: 0};
let hold = false;
let drawInterval;
let tickRate = 10;

// collection
let drawnPolylines = [];

let tempPolyline = [];

function addPolylinePoint(polyline, point) {
	// add the point to the polyline
	polyline.push(point);

	let l = polyline.length;

	// add the line 
	let tempLine = drawLine([
		{
			x: polyline[l-1].x,
			y: polyline[l-1].y,
		}, {
			x: mousePosition.x,
			y: mousePosition.y,
		},
	], 'lineA');

	// also store it
	//! lines are stored in each point? (except the first) (each line is only stored once though)
	polyline[l-1].line = tempLine;
}
function endPolyline(polyline, point) {
	// add the point to the polyline
	polyline.push(point);
}

function startLine(event) {
	if (!hold) {
		// add first point and start ticker for next points
		addPolylinePoint(tempPolyline, mousePosition);
		drawInterval = setInterval(() => {
			addPolylinePoint(tempPolyline, mousePosition);
		}, tickRate);

		hold = true;
	}
}
function moveLine(event) {
	if (hold) {
		setAttributesNS(tempPolyline[tempPolyline.length-1].line, null, {
			x2: mousePosition.x,
			y2: mousePosition.y,
		});
	}
}
function endLine(event) {
	if (hold) {
		// stop interval and add final point
		clearInterval(drawInterval);
		endPolyline(tempPolyline, mousePosition);

		// store polyline (as svg cant do this) and reset it
		drawnPolylines.push(tempPolyline);
		tempPolyline = [];

		hold = false;
	}
}

svg.addEventListener('mousedown', event => {
	mousePosition = getLocation(event);
	startLine(event);	
});
svg.addEventListener('mousemove', event => {
	mousePosition = getLocation(event);
	moveLine(event);
});
svg.addEventListener('mouseup', event => {
	mousePosition = getLocation(event);
	endLine(event);
});

svg.addEventListener('touchstart', event => {
	startLine(event);
	console.log('touch');
});
svg.addEventListener('touchmove', event => {
	moveLine(event);
});
svg.addEventListener('touchmove', event => {
	endLine(event);
});





