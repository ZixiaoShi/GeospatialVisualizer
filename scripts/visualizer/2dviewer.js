/**
 * Created by freeze on 2015-11-17.
 */
define([
    'jquery',
    'Cesium',
    'd3',
    './models'
],function(
    $,
    Cesium,
    d3,
    models
){
    var Heatmap = function(container, entityCollection, options){
        if (typeof options === 'undefined'){options = {}; }

        this.container = container;
        this.upperLimit = (typeof options.upperLimit === 'undefined') ? 100.0 : options.upperLimit;
        this.lowerLimit = (typeof options.lowerLimit === 'undefined') ? 0.0 : options.lowerLimit;
        this.dataType = (options.dataType === 'timeSeries') ? 'timeSeries' : "timeInterval";
        this.barHeight = (typeof options.barHeight === 'undefined') ? 40.0 : options.barHeight;
        this.barMargin = (typeof options.barMargin === 'undefined') ? 5.0 : options.barMargin;
        this.start = (Object.prototype.toString.call(options.start) === '[object Date]') ? options.start : d3.time.day.floor(new Date());
        this.stop = (Object.prototype.toString.call(options.stop) === '[object Date]') ? options.stop : d3.time.day.ceil(new Date());
        this.entityCollection = entityCollection;
        this.margin = {top: 20, right: 20, bottom: 30, left: 30};
        this.ticks = 5.0;
        this.referenceLine = undefined;
        this.changeTime = new Event('changeTime');
        this.sortOrder = false;
    };

    Heatmap.prototype.Initiate= function(datas, options){

        var self = this;
        if (typeof options === 'undefined'){options = {}; }
        this.datas = datas;

        this.names = [];
        for (var key in datas) {
            this.names.push(datas[key].name);
            //console.log(datas[key].name);
        }

        this.datasNew = [];
        for (var key in datas){
            this.datasNew.push(datas[key]);
        }

        console.log(this.datasNew);

        this.ids = Object.keys(datas);
        this.width = 700.0 - this.margin.left - this.margin.right;
        this.height = (this.barHeight + 2.0 * this.barMargin) * this.ids.length - this.margin.top - this.margin.bottom;

        this.startColor = (typeof options.startColor === 'undefined') ? '#d8d8d8' : options.startColor;
        this.stopColor = (typeof options.stopColor === 'undefined') ? '#F20505' : options.stopColor;

        this.x = d3.time.scale()
            .range([0, this.width])
            .domain([this.start, this.stop]);

        this.y = d3.scale.ordinal()
            .rangeRoundBands([this.height, 0], .1, .2)
            .domain(this.names);

        this.y_ordinal = d3.scale.ordinal()
            .rangeRoundBands([this.height, 0], .1, .2)
            .domain(d3.range(this.names.length));

        this.color = d3.scale.linear()
            .domain([this.lowerLimit, this.upperLimit])
            .range([this.startColor, this.stopColor]);

        this.xAxis = d3.svg.axis()
            .scale(this.x)
            .ticks(this.ticks)
            .orient('top');

        this.yAxis = d3.svg.axis()
            .scale(this.y)
            .orient('right');

        this.formatTime = d3.time.format("%e %B");

        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        this.svg = d3.select($(this.container)[0]).append('svg')
            .attr('viewBox', '0 0 ' + (this.width + this.margin.left + this.margin.right) + ' ' + (this.height + this.margin.top + this.margin.bottom))
            .attr('preserveAspectRatio', "xMinYMin meet")
            .attr('id', 'visualizer-2D-svg')
            .classed("svg-content-responsive", true)
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

        this.chart = this.svg.append('g')
            .attr('id', 'ChartSection')
            .attr('width', this.width)
            .attr('height', this.height);

        this.buttons = $(this.container)
            .prepend($('<div>')
                .attr('id', 'visualizer-2d-control')
                .prepend($('<input>')
                    .attr('type', 'button')
                    .attr('id', 'visualizer-2D-sort')
                    .attr('value', 'Sort'))
                .prepend($('<input>')
                    .attr('type', 'button')
                    .attr('id', 'visualizer-brusher-show')
                    .attr('value', 'Show All'))
                .prepend($('<input>')
                    .attr('type', 'button')
                    .attr('id', 'visualizer-brusher-hide')
                    .attr('value', 'Hide All'))
        );

        $('#visualizer-brusher-hide').on('click', function(){
            $('.brush').prop('checked', false)
                .trigger('change');
        });

        $('#visualizer-brusher-show').on('click', function(){
            $('.brush').prop('checked', true)
                .trigger('change');
        });

        $('#visualizer-2D-sort').on('click', function(){
            sortBars();
        });

        var sortBars = function(){
            this.sortOrder = ! this.sortOrder;

            var time = Cesium.JulianDate.fromDate(this.time);
            console.log(time);

            var y0 = self.y.domain(self.datasNew.sort(this.sortOrder
                    ? function(a, b) {
                return d3.ascending(a.getValue(time), b.getValue(time)); }
                    : function(a, b) { return d3.ascending(a.getValue(time), b.getValue(time)); })
                .map(function(d) { return d.name; }))
                .copy();

            var transition = self.svg.transition().duration(750),
                delay = function(d, i) { return i * 50; };


            transition.selectAll(".heatmap-bar")
                .sort(function(a, b) { return y0(a.value.name) - y0(b.value.name);})
                .delay(delay)
                .attr("y", function(d) {return y0(d.value.name); })
                .attr('transform', function (d) {
                    return 'translate(' + 0 + ',' + y0(d.value.name) + ')'
                });

            transition.select(".yAxis")
                .call(self.yAxis)
                .selectAll("g")
                .delay(delay);

            transition.selectAll(".brush-checkbox")
                .delay(delay)
                .attr("y", function(d) {return y0(d.value.name); });
        }


        var sortItems = function(a, b){
            if (self.sortOrder){
                //console.log(a.value.getValue(a.value.getValue(self.time) - b.value.getValue(self.time)));
                return d3.ascending(a.value.getValue(self.time), b.value.getValue(self.time));
            }
            else{
                return d3.descending(a.value.getValue(self.time), b.value.getValue(self.time));
            }

        };

        this.xAxisLine = this.svg.append("g")
            .attr("class", "xAxis axis")
            .attr("transform", "translate(0,0)")
            .call(this.xAxis);

        this.yAxisLine = this.svg.append("g")
            .attr("class", "yAxis axis")
            .call(this.yAxis);

    };

    Heatmap.prototype.Draw = function(){
        $('.visualizer-2D').show();
        var self = this;
        this.time = this.start;
        this.rectangles =
            this.chart.selectAll('g')
                .data(d3.entries(this.datas))
                .enter()
                .append('g')
                .attr('class', 'heatmap-bar')
                .attr('id', function (d) {
                    return 'heatBar-' + d.key;
                })
                .attr('x', function () {
                    return self.x(self.start);
                })
                .attr('y', function (d) {
                    return self.y(d.value.name);
                })
                .attr('width', self.width)
                .attr('height', function () {
                    return self.barHeight
                })
                .style('stroke', '#FFFFFF ')
                .style('stroke-opacity', 0)
                .attr('transform', function (d) {
                    return 'translate(' + 0 + ',' + self.y(d.value.name) + ')'
                })
                .on('mouseenter', function (d) {
                    var entity = self.entityCollection.getEntity(d.key);
                    if (entity == null){
                        return;
                    }
                    if (entity.highlight == true) {
                        return;
                    }

                    entity.highLight(true);
                })
                .on('mouseleave', function (d) {
                    var entity = self.entityCollection.getEntity(d.key);
                    if (entity == null){
                        return;
                    }
                    if (entity.highlight == false) {
                        return;
                    }
                    entity.highLight(false);
                })
                .selectAll('rect')
                .data(function (d) {
                    //console.log(d.value[self.dataType]._intervals._intervals[0].start);
                    return d3.entries(d.value[self.dataType]._intervals._intervals);
                })
                .enter()
                .append('rect')
                .attr('class', 'heat-rectangle')
                .attr('x', function (d) {
                    //console.log(self.x(Cesium.JulianDate.toDate(d.value.start)));
                    return self.x(Cesium.JulianDate.toDate(d.value.start));
                })
                .attr('width', function (d) {
                    return self.x(Cesium.JulianDate.toDate(d.value.stop)) - self.x(Cesium.JulianDate.toDate(d.value.start));
                })
                .attr('height', self.barHeight)
                .style('fill', function (d) {
                    return self.color(parseFloat(d.value.data));
                });

        this.checkboxes = this.chart.selectAll('foreignObject')
            .data(d3.entries(this.datas))
            .enter()
            .append('foreignObject')
            .attr('class', 'brush-checkbox')
            .attr('x', function(){return self.x(self.start)-self.margin.left;})
            .attr('y', function (d) {
                return self.y(d.value.name);
            })
            .append("xhtml:body")
            .html(function(d){
                var checked = '';
                if (self.entityCollection.getEntity(d.key).available == true){
                    checked = 'checked';
                }
                return "<form><input type='checkbox' class='brush' id='brush-" + d.key +
                    "' value='"+ d.key + "' " + checked + "/></form>"
            });

        this.referenceLine =  this.chart.append("line")
            .attr('x1', this.x(this.start))
            .attr('x2', this.x(this.start))
            .attr('y1', 0)
            .attr('y2', this.height)
            .attr('stroke-width', 3)
            .attr('stroke', 'black');

        $('.brush').change(function(){
            var id = $(this).attr('value');
            if ($(this).is(':checked')){
                var entity = self.entityCollection.getEntity(id);
                entity.changeAvailability(true);
            }
            else {
                var entity = self.entityCollection.getEntity(id);
                entity.changeAvailability(false);
            }
        });

        /*
        this.rectangles.on('click', function(){
            var time  = self.x.invert(d3.mouse(this)[0]);
            //console.log(time);
            self.timeLine(time);
            this.time = time;
        });
        */

    };


    Heatmap.prototype.timeLine = function(currentDate){
        this.referenceLine.attr('transform', "translate(" + this.x(currentDate) + "," + "0)");
        self.time = currentDate;
    };


    Heatmap.prototype.updateColor = function(startColor, stopColor){
        this.startColor = startColor;
        this.stopColor = stopColor;
        this.color = d3.scale.linear()
            .domain([this.lowerLimit, this.upperLimit])
            .range([this.startColor, this.stopColor]);
        this.chart.html("");
        console.log(this);
        this.Draw();

    };

    Heatmap.prototype.update = function(startColor, stopColor, startRange, stopRange, data, entityCollection){
        this.startColor = startColor;
        this.stopColor = stopColor;
        this.lowerLimit = startRange;
        this.upperLimit = stopRange;
        this.chart.html("");
        this.datas = data;
        this.names = [];
        this.entityCollection = entityCollection;

        for (var key in data) {
            this.names.push(data[key].name);
        }


        this.ids = Object.keys(data);

        this.x = d3.time.scale()
            .range([0, this.width])
            .domain([this.start, this.stop]);

        this.y = d3.scale.ordinal()
            .rangeRoundBands([this.height, 0], .1, .2)
            .domain(this.names);

        this.color = d3.scale.linear()
            .domain([this.lowerLimit, this.upperLimit])
            .range([this.startColor, this.stopColor]);

        this.xAxis = d3.svg.axis()
            .scale(this.x)
            .ticks(this.ticks)
            .orient('top');

        this.yAxis = d3.svg.axis()
            .scale(this.y)
            .orient('right');

        this.xAxisLine.remove();
        this.yAxisLine.remove();

        this.xAxisLine = this.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0,0)")
            .call(this.xAxis);

        this.yAxisLine = this.svg.append("g")
            .attr("class", "y axis")
            .call(this.yAxis);

        this.Draw()
    };




    return {
        HeatMap: Heatmap
    };
});