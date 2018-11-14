console.log('break');

var width = 500;
var height = 500;

// set multple attributes
function setAttributes(element, attributes) {
  for(var key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}
function setAttributesNS(element, namespace, attributes) {
  for(var key in attributes) {
    element.setAttributeNS(namespace, key, attributes[key]);
  }
}

// create controls
var form = document.createElement("form");

var input1 = document.createElement("input");
var input2 = document.createElement("input");
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



// svg namespace
var ns = 'http://www.w3.org/2000/svg';
// svg requires a namespace via createElementNS(ns, ...)
var svg = document.createElementNS(ns, 'svg');
// attributes inherit namespace of tag, but themselves don't have namespaces (prefixes)
setAttributesNS(svg, null, {
  width: width,
  height: height,
});


var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
c.setAttributeNS(null, 'cx', 50);
c.setAttributeNS(null, 'cy', 50);
c.setAttributeNS(null, 'r', 50);
c.setAttributeNS(null, 'fill', 'red');
svg.appendChild(c);


// sliders
var moveSlider = function(slider, direction) {
  c.setAttributeNS(null, "c" + direction, slider.value);
}

// final append
document.body.appendChild(svg);
document.body.appendChild(form);