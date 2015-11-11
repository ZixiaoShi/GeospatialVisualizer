var viewer;
var scene;
var clock;
var buildings;
var rootDirectory = "static/data/";
var extent = Cesium.Rectangle.fromDegrees(-75.70191,45.37844,-75.69504,45.39032);
var dataDrawn = false;
var barPlotted = false;
var collection;

//Set Default Cesium Camera Position
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = extent;
Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

$(document).ready(function(){
				$("#chartContainer").hide();
                  viewer = new Cesium.Viewer('cesiumContainer',{
                        imageryProvider : new Cesium.OpenStreetMapImageryProvider(),
                        baseLayerPicker : false,
						geoCoder: true,
						animation: true,
						//: document.getElementById("footer"),
						//infoBox: false,
						navigationInstructionsInitiallyVisible: true,
						sceneModePicker: true,
						scene3DOnly: true,
						timeline: true,
                    });
					var shawn = new Cesium.Credit("Zixiao Shi");
					var creditContainer = viewer.bottomContainer
					var credit = new Cesium.CreditDisplay(document.getElementById("footer"));
					credit.addCredit(shawn);
                  //flyToCarleton();
				  //Load Building GeoJson Data
				  //buildings = Cesium.GeoJsonDataSource.load('static/data/buildingsNew.geojson');
				  erectBuildings(rootDirectory + 'buildingsNew.geojson');
				  
				 //Load Building Data Meta Information
                  $.getJSON(rootDirectory + "BuildingDataMeta.json",
                            function(meta){
								console.log("Meta Read Complete!");
								var sources = meta["DataSet"];
								var id = 0;
								$.each(sources, function(key,value){
									$("#source").append($('<option>', {
															value: value["Location"],
															id: id,
															text: key
									}));
									id += 1;
								});
								
								var variables = meta["Unit"];
								$.each(variables, function(key,value){
									$("#data").append($('<option>', {
														   value: key,
														   text : key + " (" + value + ")"
									}));
								});
								
								
							});
							
});		
	//scene = new viewer.scene;
	//clock = new viewer.clock;
	
$("#footer").html("Footer of Page");

//This Function is not used for now
function flyToCarleton() {
    viewer.camera.flyTo({
        destination : Cesium.Cartesian3.fromDegrees(-75.701380,45.375483, 700.0),
        orientation : {
            heading : Cesium.Math.toRadians(15.0),
            pitch : Cesium.Math.toRadians(-45.0),
            roll : 0.0
        }
    });
}
	
//This function draws bar chart on where the building is located,
//Currently unused
function drawEnergy(csvUrl){	
	$.getJSON("static/data/BuildingCoordinates.json",
	function(coordinates){
              var variable = $("#data").val();
		$.getJSON("static/data/BuildingData.json",
		function(costs){
			//Rest the chart area first
			resetChart();
			
			var cylinders = [];
			var cylinder;
			//First find out the maxim
			var max = 0;
			var normalize = $("#normalization").val();
			console.log(normalize);
			$.each(coordinates, function(key,value){
				try{
				if ($("#normalization").val() == "None"){
					if (costs[key][variable] > max){max = costs[key][variable];}	 
				}
				else {
				 if (costs[key][variable]/normalize > max){max = costs[key][variable]/value[normalize];}
				}
				}
			catch(err){
				console.log(err.message);
				console.log(key);
				}
			});
			var coef = 200/max;
			
			$.each(coordinates, function(key,value){
			try{
				if (costs[key][variable] > max){max = costs[key][variable];}
				if ($("#normalization").val() == "None"){
				 cylinder = drawCylinder(value.Name,costs[key][variable],
				 value.Longitude,value.Latitude,costs[key][variable]*coef);
				 
				}
				else {
				 console.log(value[normalize]);
				 cylinder = drawCylinder(value.Name,costs[key][variable],
				 value.Longitude, value.Latitude, costs[key][variable]/value[normalize]*coef);
				}
				//console.log(costs[key]);
				 cylinders.push(cylinder);
				}
			catch(err){
				console.log(err.message);
				console.log(key);
				}
			});
			
		});
	});
}

//Erect buildings, currently all buildings are shown, future optimization may needed to display on screen buildings.
function erectBuildings(geojsonURL){
	var buildingSource = Cesium.GeoJsonDataSource.load('static/data/buildingsNew.geojson');
	buildingSource.then(function(dataSource){
		viewer.dataSources.add(dataSource);
		var entities = dataSource.entities.values;
        collection = dataSource.entities;
		console.log(buildings);
		for (var i=0; i<entities.length; i++){
			var entity = entities[i];
			entity.polygon.material = Cesium.Color.GAINSBORO;
			entity.polygon.outline=false;
            entity.polygon.extrudedHeight = entity.properties.BUILDHEIGHT;
		}
	})
	//console.log(buildings);
}

//Mouse click D3 bar event, fly to the building
function barDrill(id){
    //console.log(id);
    var building = collection.getById(id);
    //console.log(building);
    viewer.selectedEntity = building;
    viewer.flyTo(building);
}

//Mouse over D3 bar event, highlight the corresponding building in Cesium
function highlight(id){
	var building = collection.getById(id);
	building.polygon.outlineColor = Cesium.Color.White;
	building.polygon.outlineWidth = 5000.0;
	building.polygon.outline=true;
}

//Mouse away D3 bar event, de-highlight the building in Cesium
function deHighlight(id){
	var building = collection.getById(id);
	building.polygon.outline=false;
}

//This function reads a custom colour scale file, then paint the building according to different upper/lower limits defined in the file
//This function is not used currently
function overlayEnergy(csvUrl){
    viewer.dataSources.removeAll();
    buildings.then(function(dataSource){
                        viewer.dataSources.add(dataSource);
                        console.log("Read GeoJson Complete!");
                        var buildingEntities = dataSource.entities.values;
                        //Start Reading Data Set
                        $.getJSON("static/data/BuildingData.json",
                                  function(costs){
                                  console.log("Read Building Data Complete!");
                                  //Start Reading Rule Set
                                  $.getJSON("static/data/DataRule.json",
                                            function(rules){
											var variable = $("#data").val();
											console.log(variable);
                                            console.log("Read Rule Set Complete!");
                                            for (var i = 0; i < buildingEntities.length; i++){
                                                var entity = buildingEntities[i];
                                                try{
                                                var rule = rules[variable];
                                                var ruleLength = rule.length + 2;
												
												//Add description to the section
												entity.description = costs[entity.properties.BUILDCODE][variable];
												
                                                for (var pos=0; pos < rule.length; pos ++){
                                                 //console.log(rule[pos]);
                                                 //console.log(costs[entity.properties.BUILDCODE]);
                                                 if (costs[entity.properties.BUILDCODE][variable] <= rule[pos]){
                                                 //entity.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.RED,(pos+1)/ruleLength);
                                                 entity.polygon.material = Cesium.Color.fromBytes(255*(pos-1)/ruleLength,0,0,255);
                                                 break;
                                                 }
                                                 else if (pos == rule.length - 1){
                                                 //entity.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.RED,(pos+2)/ruleLength);
                                                 entity.polygon.material = Cesium.Color.fromBytes(255*(pos)/ruleLength,0,0,255);
                                                 break;
                                                 }
                                                }
                                                }
                                                catch(err){
                                                //console.log(err.message);
                                                //console.log(entity.properties.BUILDCODE);
                                                //console.log(entity.properties.BUILDNAME);
                                                entity.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.RED, 0);
                                                continue;
                                                }
                                                finally{
                                                //entity.polygon.outline=false;
                                                //entity.polygon.extrudedHeight = entity.properties.BUILDHEIGHT;
												//console.log(entity.properties);
                                                }
                                            }
                                            });
                                  });                                         
                        }).otherwise(function(error){
                                     window.alert(error);
                                     });
    
}

//This is the main automated colouring function
function overlayAuto(){
    //viewer.dataSources.removeAll();
	//alert($("#source").val());
	$.getJSON(rootDirectory + $("#source").val(),
			  function(costs){
			  console.log("Read Building Data Complete!");
						var variable = $("#data").val();
						//console.log(variable);
						var normalize = $("#normalization").val();
						
						//series for chart.js data format, unused
						/*
						var series = {
							labels:[],
							datasets:[
							{
								label: variable,
								fillColor: "rgba(151,187,205,0.9)",
								strokeColor: "rgba(151,187,205,1)",
								highlightFill: "rgba(151,187,205,0.9)",
								highlightStroke: "rgba(151,187,205,1)",
								data:[]
							}
							]
						};
						*/
						//Three lists for D3 horizontal bar chart
						indexes = ["",];
						values = [];
						colors = [];
						var data = [];
						
						//Find out upper limit (max value)
						var max = 0;
						for (var i = 0; i < collection.values.length; i++){
							var entity = collection.values[i];
							try{
								var value = costs[entity.properties.BUILDCODE][variable]*1.0;
								
								if (normalize != "None"){
									value = value/entity.properties[normalize];
								}
																					
								//console.log(entity.properties.BUILDNAME + ": " + value);
								if (value >= max){
									max = value;
								}
								
								//series[entity.properties.BUILDCODE] = value;
								/*
								if (series.labels.indexOf(entity.properties.BUILDNAME) > -1){
								}
								else{
									series.labels.push(entity.properties.BUILDNAME);
									series.datasets[0].data.push(value);
								}
								*/
								
								
							}
							catch(err){
								console.log(err.message);
							}
						}
						//console.log(series);
						//console.log("Max Value is: " + max);
						for (var i = 0; i < collection.values.length; i++){
							var entity = collection.values[i];
							try{
								var value;
								var scale;
								if (normalize == "None"){
									value = costs[entity.properties.BUILDCODE][variable];
									scale = value/max
									//console.log(entity.properties.BUILDNAME + ": " + value);
									entity.polygon.material = Cesium.Color.fromBytes((200*scale+50),135,0,255);
									entity.description = value;
								}
								else{
									if (isNaN(parseFloat(entity.properties[normalize])) | parseFloat(entity.properties[normalize]) == 0.0)
									{
										continue;
									}
									value = costs[entity.properties.BUILDCODE][variable]/entity.properties[normalize];
									scale = value/max;
									entity.polygon.material = Cesium.Color.fromBytes((200*scale+50),135,0,255);
									entity.description = value;
								}
								
								//Check if building already exists in the index, add index and color code
								if (indexes.indexOf(entity.properties.BUILDNAME) > -1){}
								else{
									data.push(
									{
										"index": entity.properties.BUILDNAME,
										"value": parseFloat(value),
										"color": rgbToHex(parseInt((200*scale+50)),135,0),
                                        "code": entity.id
									}
									);
									indexes.push(entity.properties.BUILDNAME);
									//values.push(parseFloat(value));
									//colors.push(rgbToHex(parseInt((200*scale+50)),50,0));
								}

							}
							catch(err){
							//console.log(err.message);
							//console.log(entity.properties.BUILDCODE);
							//console.log(entity.properties.BUILDNAME);
							entity.polygon.material = Cesium.Color.GAINSBORO;
							continue;
							}
							finally{
							//entity.polygon.outline=false;
							//entity.polygon.extrudedHeight = entity.properties.BUILDHEIGHT;
							//entity.id = entity.properties.BUILDCODE;
							//console.log(entity.properties);
							dataDrawn = true;
							}
						}
						
						
						//Create Bar Chart
						/* Chartjs section
						$("#chartContainer").show();
						$("#d3Chart").remove();
						$("#chartContainer").append('<canvas id="d3Chart" height="500" width="700"></canvas>');
						var ctx = document.getElementById("d3Chart").getContext("2d");
						var barChart = new Chart(ctx).Bar(series);
						*/
						//console.log(data);
						
						if (document.getElementById('hideBar').checked){
							$("#chartContainer").hide()
						}
						else{
							$("#chartContainer").show();
						}
						
						if (barPlotted == false){
							drawHBar(data);
							barPlotted = true;}
						else {
						updateBar(data);
						}
						

			  });
	
	//Switch to previous dataset
	function previousDataset(){
		var selID = parseInt($("#source").find('option:selected').attr('id'));
		if (selID > 0){
			selID = selID - 1;
			$("#source option").eq(selID).prop('selected',true);
			if (dataDrawn == true){overlayAuto();}
		}
		
	}

	//Switch to next dataset
	function nextDataset(){
		var selID = parseInt($("#source").find('option:selected').attr('id'));
		var lastID = parseInt($("#source option:last-child").attr('id'));
		if (selID < lastID){
			selID = selID + 1;
			//alert(selID);
			$("#source option").eq(selID).prop('selected',true);
			if (dataDrawn == true){overlayAuto();}
		}
		
	}
    
}



//A function to draw a cylinder in Cesium
function drawCylinder(name,desc,lat,lon,value){
	var redCone = viewer.entities.add({
		name : name,
		description: desc,
		position: Cesium.Cartesian3.fromDegrees(lat, lon,value/2),
		cylinder : {
			length : value,
			topRadius : 10.0,
			bottomRadius : 10.0,
			material : Cesium.Color.RED.withAlpha(0.9)
			}
	});
	
	return redCone;
}

/* This section contains code that converts RGB to hex */
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function resetChart(){
    viewer.entities.removeAll();
}

//Hide D3 bar charts
function hideBar(){
	//alert("hide!");
	if (document.getElementById('hideBar').checked){	
		$("#chartContainer").hide();
	}
	else if (barPlotted ==true){
		$("#chartContainer").show();
	}
}

//Sort internal data, currently unused
function sortData(){
	if ($("#sortData").checked){
		var sortedData = sortByKey(data, "value");
		updateBar(sortedData);
		}
	else{
		updateBar(data);
		}
}