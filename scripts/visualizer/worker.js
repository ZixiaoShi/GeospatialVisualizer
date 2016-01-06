/**
 * Some common worker functions
 */


function getByName(arr, value) {

	  var result  = arr.filter(function(o){return o.name == value;} );

	  return result? result[0] : null; // or undefined

	}

function guid() {
	  function s4() {
	    return Math.floor((1 + Math.random()) * 0x10000)
	      .toString(16)
	      .substring(1);
	  }
	  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
	    s4() + '-' + s4() + s4() + s4();
	}
