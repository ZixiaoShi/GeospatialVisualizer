/**
 * Created by freeze on 2015-11-08.
 */
define(
    function(){

    var CreateElements = function(container){
        $(container).append($('<div>')
            .addClass("visualizer-geoviewer")
            .attr('id','GeoViewer')
        )

            .append($('<div>')
                .addClass('visualizer-legend')
                .attr('id', 'legend')
                .append($('<canvas>')
                    .attr('id', 'visualizer-legend-canvas')
                    .attr('width', '400px')
                    .attr('height', '70px')
                )
                .append($('<form>')
                    .addClass('visualizer-customize')
                    .append($('<input>')
                        .addClass('visualizer-customize-range')
                        .prop('type', 'text')
                        .attr('id', 'StartRange')
                    )
                    .append($('<input>')
                        .prop('type', 'text')
                        .attr('id','StartColor')
                    )
                    .append($('<input>')
                        .addClass('visualizer-customize-range')
                        .prop('type', 'text')
                        .attr('id', 'EndRange')
                    )
                    .append($('<input>')
                        .prop('type', 'text')
                        .attr('id','EndColor')
                    )
                    .append($('<input>')
                        .addClass('visualizer-customize-submit')
                        .prop('type', 'button')
                        .attr('value', 'Customize')
                    )
                    .append($('<input>')
                        .addClass('visualizer-customize-keepRange')
                        .prop('type','checkbox')
                        .attr('id', 'constantRange')
                        .attr('value', 'Keep Range')
                        .prop('checked', false))
            ))
            .append($('<div>')
                .addClass('visualizer-control')
                .append($('<span>')
                    .append($('<label>',{
                        text: 'Variable: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-variable'))
                )
                .append($('<br>'))
                .append($('<span>')
                    .append($('<label>',{
                        text: 'Dataset: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-dataset'))
                    .append($('<button>',{
                        id: 'control-dataset-confirm',
                        text: 'Change Dataset'
                    }))
                )
                .append($('<br>'))
                .append($('<span>')
                    .append($('<label>',{
                        text: 'Normalization by: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-normalize'))
                )
                .append($('<br>'))
                .append($('<span>')
                    .append($('<label>',{
                        text: 'Category to display: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-category'))
                )
            )
            .append($('<div>')
                .addClass('visualizer-2D')
                .attr('id', '2DSection')

            )
    };

    return{
        CreateElements: CreateElements
    }
});