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
                .hide()
                .attr('id', 'legend')
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
                    .append($('<label>')
                        .attr('value', 'Customize Range')
                        .text('Customize')
                    )
                    .append($('<input>')
                        .addClass('visualizer-customize-keepRange')
                        .prop('type','checkbox')
                        .attr('id', 'customRange')
                        .attr('value', 'Keep Range')
                        .prop('checked', false))
                )
                .append($('<canvas>')
                    .attr('id', 'visualizer-legend-canvas')
                    .attr('width', '400px')
                    .attr('height', '50px')
                )
                .append($('<div>',{
                    id: 'visualizer-slider',
                    class: 'visualizer-slider'
                }))
            )
            .append($('<div>')
                .addClass('visualizer-control')
                .append($('<h4>',{
                    text: 'User Control'
                })
                    .addClass('visualizer-ui-header')
                )
                .append($('<hr>')
                    .addClass('visualizer-ui-header-hr')
                )
                .append($('<span>')
                    .addClass('visualizer-control-span')
                    .append($('<label>',{
                        text: 'Variable: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-variable'))
                )
                .append($('<br>'))
                .append($('<span>')
                    .addClass('visualizer-control-span')
                    .append($('<label>',{
                        text: 'Dataset: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-dataset'))
                    .append($('<button>',{
                        id: 'control-dataset-confirm',
                        text: 'Load Dataset'
                    }))
                )
                .append($('<hr>'))
                .append($('<span>')
                    .addClass('visualizer-control-span')
                    .append($('<label>',{
                        text: 'Normalization by: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-normalize'))
                )
                .append($('<br>'))
                .append($('<span>')
                    .addClass('visualizer-control-span')
                    .append($('<label>',{
                        text: 'Category to display: '
                    }))
                    .append($('<select>')
                        .attr('id', 'control-category'))
                )
                .append($('<br>'))
                .append($('<span>')
                    .addClass('visualizer-control-span')
                    .append($('<input type="checkbox">',{
                    })
                        .addClass('visualizer-control-infoToggle')
                    )
                    .append($('<label>',{
                        text: 'Show InfoBox'
                    })
                        .css('float', 'right')
                        .css('margin-top', '10px'))
                )
            )
            .append($('<div>')
                .addClass('visualizer-2D')
                .attr('id', '2DSection')
                .hide()
            )
            .append($('<div>', {
                class: 'visualizer-infobox',
                id: 'visualizer-infobox'
            })
                .hide()
                .append($('<table>',{
                    class: 'visualizer-infobox-table',
                    id: 'visualizer-infobox-table'
                }))
            )
    };

    return{
        CreateElements: CreateElements
    }
});