define([
    'Cesium',
    './template',
    './3dviewer',
    './models',
    './utilities'
],function(
    Cesium,
    template,
    GeospatialSection,
    models,
    utilities
)
{
    "use strict";

    var Visualizer = function (container,options) {
        template.CreateElements(container);
        var self = this;
        this.geospatialcontainer = "GeoViewer";
        this._geospatialSection = undefined;
        this._geospatialBool = true;
        this._dataDrawn = false;
        this._barPlotted = false;
        this._defaultRangeMin = 0.0;
        this._defaultRangeMax = 0.0;
        this.customRangeMin = 0.0;
        this.customRangeMax = 0.0;
        this._defaultEntityCollection = new Cesium.EntityCollection();

        this._startColor = '0AF229';
        this._endColor = 'F20505';

        this._defaultDatasetCollection = new models.DatasetCollection();
        this._defaultVariableCollection = new models.VariableCollection();


        this._startColorPicker = $("#StartColor").spectrum({
            color: "#" + this._startColor,
            change: function(color){updateColor();}
            });

        this._endColorPicker = $("#EndColor").spectrum({
            color: "#" + this._endColor,
            change: function(color){updateColor();}
        });

        if (this._geospatialBool == true) {
            self._geospatialSection = new GeospatialSection.GeospatialSection(this.geospatialcontainer);
        }

        //Read Meta Data
        this.LoadMeta = function(metaURL) {
            $.getJSON(metaURL,
                function(meta) {
                    //console.log("Meta Read Complete!");
                    var sources = meta["DataSet"];
                    var id = 0;
                    $.each(sources, function (key, value) {

                        //Create dataset and append to default datasets
                        var dataset = new models.Dataset(key, value["url"]);
                        self._defaultDatasetCollection.addDataset(dataset);

                        /*
                         $("#source").append($('<option>', {
                         value: value["url"],
                         id: id,
                         text: key
                         }));
                         */
                        id += 1;
                    });
                    var variables = meta["Variables"];
                    $.each(variables, function(key,value){

                        //Create variable and append to default variable set
                        var variable = new models.Variable(key, value);
                        self._defaultVariableCollection.addVariable(variable);

                        /*
                         $("#data").append($('<option>', {
                         value: key,
                         text : key + " (" + value + ")"
                         }));
                         */
                    });
                }).then(function(){
                //console.log(self._defaultDatasetCollection.getDataset("2014"));
                //console.log(self._defaultVariableCollection.values);
            });
        };

        this.LoadBuilding = function(geojsonURL,fileFormat, extrudeBool){
            if (fileFormat == 'geojson'){
                var dataSource = new Cesium.GeoJsonDataSource();
            }
            else if (fileFormat == 'kml'){
                var dataSource = new Cesium.KmlDataSource();
            }
            else{
                console.warn("Data source has to be geojson or kml format!");
                return;
            }
            dataSource.load(geojsonURL).then(function(datasource){
                console.log('read datasource finished!');
                //collection = datasource.entities;
                //console.log(self._geospatialSection.viewer.entities.values);
                for (var i=0; i<datasource.entities.values.length; i++){
                    var entity = datasource.entities.values[i]
                    //console.log(entity);
                    models.customizeEntity(entity);
                    //console.log("customize Complete");
                    self._defaultEntityCollection.add(entity);
                    self._geospatialSection.viewer.entities.add(entity);
                    if (extrudeBool == true){
                        GeospatialSection.extrudeEntity(entity);
                    }
                }
                self.drawDataset();
                self._geospatialSection.viewer.flyTo(datasource.entities);
                //console.log(self._defaultEntityCollection);
            });
        };

        //Drawing Dataset and doing Colors
        this.drawDataset = function() {
            $.getJSON(self._defaultDatasetCollection.getCurrentDataset().url,
                function(costs){
                    console.log("Read Building Data Complete!");
                    //console.log(costs);
                    var variable = self._defaultVariableCollection.getCurrentVariable().name;
                    console.log(variable);
                    //var normalize = $("#normalization").val();
                    var normalize = "None";
                    var collection = self._defaultEntityCollection.values;
                    //console.log(collection);
                    //data variable for d3.js
                    var data = [];
                    var indexes = [""];
                    //var entities = viewer.dataSources.get(0).entities.values;
                    //console.log(viewer.dataSources.get(0).entities.values);

                    //Find out upper limit (max value)
                    for (var i = 0; i < collection.length; i++){
                        var entity = collection[i];
                        entity.properties.Values = costs[entity.properties.Id];
                        try{
                            //console.log(entity.properties.BUILDCODE);
                            if (! entity.properties.Id){console.log(entity);}
                            else{
                                var value = costs[entity.properties.Id][variable]*1.0;

                                if (normalize != "None"){
                                    value = value/entity.attributes[normalize];
                                }
                                if (value >= self._defaultRangeMax){
                                    //console.log("Updating default max range");
                                    self._defaultRangeMax = utilities.roundUp(value,1);
                                }
                            }

                        }
                        catch(err){
                            console.log(err.message);
                            console.log(entity.name);
                            //console.log(entity.id);
                        }
                    }
                    /*
                     if (document.getElementById('hideBar').checked){
                     $("#chartContainer").hide()
                     }
                     else{
                     $("#chartContainer").show();
                     }

                     if (barPlotted == false){
                     //drawHBar(data);
                     //barPlotted = true;
                     }
                     else {
                     //updateBar(data);
                     }
                     */
                    //console.log(data);
                    console.log("finished");
                    $("#StartRange").val(self._defaultRangeMin);
                    $("#EndRange").val(self._defaultRangeMax);
                    self.drawEntity();
                    drawLegend(self._startColor,self._endColor,self._defaultRangeMin,self._defaultRangeMax);
                });

        };

        this.drawEntity = function(){
            var normalize = "None";
            var variable = self._defaultVariableCollection.getCurrentVariable().name;
            for (var i=0; i<self._defaultEntityCollection.values.length;i++){
                var entity = self._defaultEntityCollection.values[i];
                try{
                    if (! entity.properties.Id){console.log(entity);}
                    else{
                        if (!entity.properties.Values[variable]){continue;}
                        var value = entity.properties.Values[variable];
                        if (normalize == "None"){
                            var scale = value/(self._defaultRangeMax-self._defaultRangeMin);
                        }
                        else{
                            if (isNaN(parseFloat(entity.properties[normalize])) || parseFloat(entity.properties[normalize]) == 0.0)
                            {
                                continue;
                            }
                            scale = (value-self._defaultRangeMin)/(self._defaultRangeMax-self._defaultRangeMin)/entity.properties[normalize];
                        }
                        //If the value is higher than upper range
                        if (scale > 1){
                            entity.polygon.material = Cesium.Color.BLACK;
                        }
                        //If the value is lower than lower range
                        if (scale < 0){
                            entity.polygon.material = Cesium.Color.WHITE;
                        }
                        else{
                            entity.properties.Color =  utilities.colorFromGradient(self._startColor.toString(),self._endColor.toString(),scale);
                            entity.polygon.material = Cesium.Color.fromCssColorString("#"+ entity.properties.Color);
                        }
                    }
                    /*

                    if (indexes.indexOf(entity.name) > -1){}
                    else{
                        data.push(
                            {
                                "index": entity.name,
                                "value": parseFloat(value),
                                "color": entity.properties.Color,
                                "code": entity.id
                            }
                        );
                        indexes.push(entity.name);
                    }
                     */
                }

                catch(err){
                    console.log(err.message);
                    //console.log(entity.properties.BUILDCODE);
                    console.log(entity.name);
                    entity.polygon.material = Cesium.Color.GAINSBORO;
                }
                finally{
                    //entity.polygon.outline=false;
                    //entity.polygon.extrudedHeight = entity.properties.BUILDHEIGHT;
                    //entity.id = entity.properties.BUILDCODE;
                    //console.log(entity.polygon.material);
                    self._dataDrawn = true;
                }
            }
            drawLegend(self._startColor,self._endColor,self._defaultRangeMin,self._defaultRangeMax);
            console.log("redraw complete");
        };





        //Some worker functions for main.js
        function updateColor(){
            self._startColor = self._startColorPicker.spectrum('get').toHex();
            self._endColor = self._endColorPicker.spectrum('get').toHex();
            self.drawEntity();
        }

        function drawLegend(colorMin, colorMax, rangeMin, rangeMax){
            var ctx = document.getElementById("visualizer-legend-canvas").getContext("2d");
            ctx.clearRect(0, 0, 400, 70);
            var grd = ctx.createLinearGradient(0, 0, 400, 0);
            grd.addColorStop(0, "#"+colorMin);
            grd.addColorStop(1, "#"+colorMax);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0,0,400,70);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 400, 40);
            ctx.font = "15px Arial";
            ctx.fillText(rangeMin,1,60);
            ctx.textAlign = "center";
            ctx.fillText((((rangeMin+rangeMax)/2)).toString(), 200, 60);
            ctx.textAlign = "right";
            ctx.fillText(rangeMax,399,60);
            console.log("legend draw complete");
        }
    };
    return{
        Visualizer: Visualizer
    };
});
