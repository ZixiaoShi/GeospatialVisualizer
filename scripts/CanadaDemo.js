/**
 * 
 * This is the main file for the application
 */
require.config({
    paths: {
        jquery: 'lib/jquery-2.1.4.min',
        spectrum: 'lib/spectrum',
        //underscore: 'lib/underscore-min',
        Cesium: 'lib/Cesium/Cesium',
        d3: 'lib/d3.min',
        noUiSlider: 'lib/nouislider'
    },
    //This uses the build version of Cesium
    shim: {
        Cesium:{
            exports: 'Cesium'
        },
        noUiSlider: {
            exports: 'noUiSlider'
        }
    },
    packages: ['visualizer']
});

require(['visualizer', 'jquery','spectrum'],function(visualizer, $,spectrum){
    //jscolor.install();
    //console.log(jscolor);
    loadCss('css/spectrum.css');
    loadCss("scripts/lib/Cesium/Widgets/widgets.css");
    loadCss("css/visualizer.css");
    loadCss("css/nouislider.css");
    //loadjs("scripts/Cesium/Cesium.js");
    console.log(visualizer === undefined);
    var vis = new visualizer.Visualizer('#GeospatialContainer');
    //console.log(vis._geospatialSection.viewer.clock.currentTime);
    //vis.LoadMeta("SampleData/BuildingDataMeta.json");

    vis.LoadMeta("SampleData/CanadaMeta.json");
    vis.LoadEntities("SampleData/Canada.geojson",'geojson',false);
   // vis.LoadEntities("SampleData/Glengarry.geojson",'geojson',true);
    //vis.LoadMeta("SampleData/GlengarryMeta.json");
    //vis.readCurrentTimeSeries();
    //vis.initiate("SampleData/CarletonCampus.geojson",'geojson',true, "SampleData/CarletonMeta.json");
    //vis.readCurrentTimeSeries();
});


function loadjs(url){
    var script = document.createElement("script");
    script.href = url
    document.getElementsByTagName("head")[0].appendChild(script);
}

function loadCss(url) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
}