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
    };

    Heatmap.prototype.Initiate= function(datas, options){

        if (typeof options === 'undefined'){options = {}; }
        this.datas = datas;

        this.names = [];
        for (var key in datas) {
            this.names.push(datas[key].name);
        }

        this.ids = Object.keys(datas);
        this.width = 700.0 - this.margin.left - this.margin.right;
        this.height = (this.barHeight + 2.0 * this.barMargin) * this.ids.length - this.margin.top - this.margin.bottom;

        this.startColor = (typeof options.startColor === 'undefined') ? '#0AF229' : options.startColor;
        this.stopColor = (typeof options.stopColor === 'undefined') ? '#F20505' : options.stopColor;

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

        this.formatTime = d3.time.format("%e %B");

        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        this.svg = d3.select($(this.container)[0]).append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

        this.chart = this.svg.append('g')
            .attr('id', 'ChartSection')
            .attr('width', this.width)
            .attr('height', this.height);

        this.buttons = $(this.container)
            .prepend($('<input>')
                .attr('type', 'button')
                .attr('id', 'visualizer-brusher-show')
                .attr('value', 'ShowAll'))
            .prepend($('<input>')
                .attr('type', 'button')
                .attr('id', 'visualizer-brusher-hide')
                .attr('value', 'HideAll'));

        $('#visualizer-brusher-hide').on('click', function(){
            $('.brush').prop('checked', false)
                .trigger('change');
        });

        $('#visualizer-brusher-show').on('click', function(){
            $('.brush').prop('checked', true)
                .trigger('change');
        });

        this.xAisLine = this.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0,0)")
            .call(this.xAxis);

        this.yAxisLine = this.svg.append("g")
            .attr("class", "y axis")
            .call(this.yAxis);

    };

    Heatmap.prototype.Draw = function(){


        var self = this;
        this.rectangles =
            this.chart.selectAll('g')
                .data(d3.entries(this.datas))
                .enter()
                .append('g')
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
                .on('mouseover', function (d) {
                    var entity = self.entityCollection.getEntity(d.key);
                    if (entity.highlight == true) {
                        return;
                    }
                    entity.highLight(true);
                })
                .on('mouseout', function (d) {
                    var entity = self.entityCollection.getEntity(d.key);
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
                return "<form><input type='checkbox' class='brush' id='brush-" + d.key +
                    "' value='"+ d.key + "' checked='true'/></form>"
            });

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

    };

    Heatmap.prototype.updateColor = function(startColor, stopColor){
        this.startColor = startColor;
        this.stopColor = stopColor;
        this.color = d3.scale.linear()
            .domain([this.lowerLimit, this.upperLimit])
            .range([this.startColor, this.stopColor]);
        //console.log(this);
        this.Draw();

    };


    return {
        HeatMap: Heatmap
    };
});