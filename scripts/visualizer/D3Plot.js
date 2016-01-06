define([
		'd3',
		'./models'
],function(
		d3,
		models
){
	var barPlot = function(data){
		drawHBarNew(data);
	};

	var xscale;
	var yscale;
	var colorscale;
	var bar_height = 25;
	var w = 500;
	var left_width = 150;
	var indexes;
	var data;
	var sortOrder = false;

	function sortByKey(array, key) {
		return array.sort(function(a, b) {
			var x = a[key]; var y = b[key];
			return ((x > y) ? -1 : ((x < y) ? 1 : 0));
		});
	}

	function drawHBarNew(data){
		sortOrder = false;

		if($("#sortData").checked){
			data = sortByKey(data,"value");
		}

		var h = bar_height * data.length;

		xscale = d3.scale.linear()
				.domain([0, d3.max(data, function(d) {return d.value;})])
				.range([0, w]);

		indexes = data.map(function(d){
			return d.index;
		});

		yscale = d3.scale.ordinal()
				.domain(indexes)
				.rangeRoundBands([0,h],.1,.2);

		var colors = data.map(function(d){
			return d.color;
		});

		var code = data.map(function(d){
			return d.code;
		});

		var svg = d3.select('#2DSection')
				.attr({'width':left_width + w,'height':h});

		colorscale = d3.scale.ordinal()
				.domain(indexes)
				.range(colors);

		codescale = d3.scale.ordinal()
				.domain(indexes)
				.range(code);

		/*
		 var grids = svg.append('g')
		 .attr('id','grid')
		 .attr('transform','translate(150,10)')
		 .selectAll('line')
		 .data(grid)
		 .enter()
		 .append('line')
		 .attr({'x1':function(d,i){ return i*30; },
		 'y1':function(d){ return d.y1; },
		 'x2':function(d,i){ return i*30; },
		 'y2':function(d){ return d.y2; },
		 })
		 .style({'stroke':'#adadad','stroke-width':'1px'});
		 */

		var	xAxis = d3.svg.axis();
		xAxis
				.orient('bottom')
				.scale(xscale)
				.tickSize(1)
				.ticks(3);


		var	yAxis = d3.svg.axis()
				.scale(yscale)
				.orient('left');
		/*
		 .tickSize(1)
		 .tickValues(d3.range(data.length));
		 */

		/*
		 var y_xis = svg.append('g')
		 .attr("transform", "translate(" + left_width + ",0)")
		 .attr('id','yaxis')
		 .call(yAxis);
		 */
		var x_xis = 	d3.select('#svgAxis')
				.attr('width', w + left_width)
				.attr('height', '15')
				.append('g')
				.attr('transform', "translate(" + left_width + ",0)")
				.attr('id','xaxis')
				.call(xAxis);

		var chart = svg.append('g')
				.attr('id','bars')
				.selectAll('rect')
				.data(data)
				.enter()
				.append('rect')
				.attr('height',yscale.rangeBand())
				.attr('x',left_width)
				.attr('y',function(d){return yscale(d.index)})
				.style('fill',function(d){ return colorscale(d.index); })
				.attr('width',0)
				.on("mouseover",function(d){
					d3.select(this).style("fill","blue");
					highlight(codescale(d.index));
				})
				.on("mouseout", function(d){
					d3.select(this).style("fill", function(d){
						return colorscale(d.index);
					});
					deHighlight(codescale(d.index));
				})
				.on("click", function(d){
					barDrill(codescale(d.index));
				});

		var transitBar = svg.select('#bars')
				.selectAll('rect')
				.data(data)
				.transition()
				.duration(1000)
				.attr('width',function(d){ return xscale(d.value); });

		var transitext = d3.select('#bars')
				.selectAll('text.value')
				.data(data)
				.enter()
				.append('text')
				.attr('class', 'textvalue')
				.attr({'x':function(d) {return xscale(d.value) + left_width; },'y':function(d){ return yscale(d.index) + yscale.rangeBand()/2; }})
				.attr("dy",".36em")
				.text(function(d){ return d3.format(",")(parseInt(d.value)); })
				.attr('text-anchor', 'end')
				.style({'fill':'#000000','font-size':'14px'});

		var indexes = svg.select('#bars')
				.selectAll('text.index')
				.data(data)
				.enter().append('text')
				.attr('x', 0)
				.attr('y', function(d) {return yscale(d.index) + yscale.rangeBand()/2;})
				.attr('dy', '.36em')
				.attr('text-anchor', 'start')
				.attr('class', 'index')
				.text(function(d){ return d.index;});


	}

	function updateBar(data)
	{
		sortOrder = false;

		if($("#sortData").checked){
			data = sortByKey(data,"value");
		}

		var svg = d3.select("#svgContainer");

		var h = bar_height * data.length;

		xscale = d3.scale.linear()
				.domain([0, d3.max(data, function(d) {return d.value;})])
				.range([0,w]);

		indexes = data.map(function(d){
			return d.index;
		});
		var colors = data.map(function(d){
			return d.color;
		});

		colorscale = d3.scale.ordinal()
				.domain(indexes)
				.range(colors);

		yscale = d3.scale.ordinal()
				.domain(indexes)
				.rangeRoundBands([0,h],.1,.2);

		var	xAxis = d3.svg.axis();
		xAxis
				.orient('bottom')
				.scale(xscale)
				.tickSize(1)
				.ticks(3);

		var	yAxis = d3.svg.axis()
				.scale(yscale)
				.orient('left');


		var x_xis = 	d3.select('#svgAxis')
				.selectAll('#xaxis')
				.attr('transform', "translate(" + left_width + ",0)")
				.attr('id','xaxis')
				.call(xAxis);

		var chart = svg.select('#bars')
				.selectAll('rect')
				.data(data)
				.transition()
				.duration(1000)
				.attr('height',yscale.rangeBand())
				.attr('x',left_width)
				.attr('y',function(d){return yscale(d.index)})
				.style('fill',function(d){ return colorscale(d.index); })
				.attr('width',function(d){ return xscale(d.value);});

		var transitext = svg.select('#bars')
				.selectAll('.textvalue')
				.data(data)
				.attr({'x':function(d) {return xscale(d.value) + left_width; },'y':function(d){ return yscale(d.index) + yscale.rangeBand()/2; }})
				.attr("dy",".36em")
				.text(function(d){ return d3.format(",")(parseInt(d.value)); });

		var indexes = svg.select('#bars')
				.selectAll('text.index')
				.data(data)
				.attr('x', 0)
				.attr('y', function(d) {return yscale(d.index) + yscale.rangeBand()/2;})
				.attr('dy', '.36em')
				.text(function(d){ return d.index;});


	}


	function sortByKey(array, key) {
		return array.sort(function(a, b) {
			var x = a[key]; var y = b[key];
			return ((x > y) ? -1 : ((x < y) ? 1 : 0));
		});
	}

	var sortData = function () {
		var svg = d3.select("#svgContainer");

		sortOrder = !sortOrder;

		sortItems = function (a, b) {
			if (sortOrder) {
				return b.value - a.value;
			}
			return a.value - b.value;
		};

		svg.selectAll("rect")
				.sort(sortItems)
				.transition()
				.delay(function (d, i) {
					return i * 50;
				})
				.duration(1000)
				.attr("y", function (d,i) {
					return yscale(indexes[i+1]);
				});


		svg.select("#bars")
				.selectAll('.textvalue')
				.sort(sortItems)
				.transition()
				.delay(function (d, i) {
					return i * 50;
				})
				.duration(1000)
				.text(function (d) {
					return d3.format(",")(parseInt(d.value));;
				})
				.attr("y", function (d, i) {
					return yscale(indexes[i+1]) + yscale.rangeBand()/2;
				})
				.attr("dy",".36em")
				.attr("x", function (d) {
					return xscale(d.value) + left_width;
				});

		svg.select("#bars")
				.selectAll('text.index')
				.sort(sortItems)
				.transition()
				.delay(function (d, i) {
					return i * 50;
				})
				.duration(1000)
				.text(function (d) {
					return d.index;
				})
				.attr("y", function (d, i) {
					return yscale(indexes[i+1]) + yscale.rangeBand()/2;
				})
				.attr("dy",".36em")
				.attr("x", 0);
	};

	return{
		barPlot: barPlot
	}
});
