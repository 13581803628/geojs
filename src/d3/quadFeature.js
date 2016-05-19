var inherit = require('../inherit');
var registerFeature = require('../registry').registerFeature;
var quadFeature = require('../quadFeature');

//////////////////////////////////////////////////////////////////////////////
/**
 * Create a new instance of class quadFeature
 *
 * @class geo.d3.quadFeature
 * @param {Object} arg Options object
 * @extends geo.quadFeature
 * @returns {geo.d3.quadFeature}
 */
//////////////////////////////////////////////////////////////////////////////
var d3_quadFeature = function (arg) {
  'use strict';
  if (!(this instanceof d3_quadFeature)) {
    return new d3_quadFeature(arg);
  }

  var $ = require('jquery');
  var d3 = require('d3');
  var object = require('./object');

  quadFeature.call(this, arg);
  object.call(this);

  var m_this = this,
      s_exit = this._exit,
      s_init = this._init,
      s_update = this._update,
      m_quads;

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Build this feature
   */
  ////////////////////////////////////////////////////////////////////////////
  this._build = function () {
    if (!this.position()) {
      return;
    }
    var renderer = this.renderer(),
        map = renderer.layer().map();

    m_quads = this._generateQuads();
    var data = [];
    $.each(m_quads.clrQuads, function (idx, quad) {
      data.push({type: 'clr', quad: quad});
    });
    $.each(m_quads.imgQuads, function (idx, quad) {
      if (quad.image) {
        data.push({type: 'img', quad: quad});
      }
    });
    $.each(data, function (idx, d) {
      var points = [], pos = [], area, maxarea = -1, maxv, i;
      for (i = 0; i < d.quad.pos.length; i += 3) {
        var p = map.gcsToDisplay({x: d.quad.pos[i], y: d.quad.pos[i + 1], z: d.quad.pos[i + 2]}, null);
        pos.push(p);
        points.push('' + p.x + ',' + p.y);
      }
      d.points = points[0] + ' ' + points[1] + ' ' + points[3] + ' ' + points[2];
      /* We can only fit three corners of the quad to the image, but we get to
       * pick which three.  We choose to always include the largest of the
       * triangles formed by a set of three vertices.  This can result in some
       * of the image not being visible, or, in twisted or concave quads, some
       * of the image being duplicated. */
      for (i = 0; i < 4; i += 1) {
        area = Math.abs(
          pos[(i + 1) % 4].x * (pos[(i + 2) % 4].y - pos[(i + 3) % 4].y) +
          pos[(i + 2) % 4].x * (pos[(i + 3) % 4].y - pos[(i + 1) % 4].y) +
          pos[(i + 3) % 4].x * (pos[(i + 1) % 4].y - pos[(i + 2) % 4].y)) / 2;
        if (area > maxarea) {
          maxarea = area;
          maxv = i;
        }
      }
      d.quad.svgTransform = [
        maxv === 3 || maxv === 2 ? pos[1].x - pos[0].x : pos[3].x - pos[2].x,
        maxv === 3 || maxv === 2 ? pos[1].y - pos[0].y : pos[3].y - pos[2].y,
        maxv === 0 || maxv === 2 ? pos[1].x - pos[3].x : pos[0].x - pos[2].x,
        maxv === 0 || maxv === 2 ? pos[1].y - pos[3].y : pos[0].y - pos[2].y,
        maxv === 2 ? pos[3].x + pos[0].x - pos[1].x : pos[2].x,
        maxv === 2 ? pos[3].y + pos[0].y - pos[1].y : pos[2].y
      ];
    });
    var id = this._d3id();
    var feature = {
      id: id,
      data: data,
      append: 'polygon',
      attributes: {
        points: function (d) {
          return d.points;
        },
        fill: function (d) {
          if (d.type === 'clr') {
            return d3.rgb(255 * d.quad.color.r, 255 * d.quad.color.g, 255 * d.quad.color.b);
          }
          if (!d.quad.image) {
            return 'none';
          }
          /* Our method for setting style for fill prevents doing this in the
           * style object, so do it here. */
          d3.select(this).style('fill', 'url(#' + id + '-img-' + d.quad.idx + ')');
        },
        stroke: false
      },
      style: {
        fillOpacity: function (d) {
          return d.quad.opacity;
        }
      },
      classes: ['d3QuadFeature'],
      defs: {
        data: m_quads.imgQuads,
        append: 'pattern',
        attributes: {
          id: function (d) {
            return id + '-img-' + d.idx;
          },
          x: 0,
          y: 0,
          patternTransform: function (d) {
            return 'matrix(' + d.svgTransform.join(' ') + ')';
          },
          patternUnits: 'userSpaceOnUse',
          width: 1,
          height: 1,
          enter: function (d) {
            var node = d3.select(this),
                imageElem = node.selectAll('.d3QuadFeatureImage');
            if (d.image && d.image.src) {
              if (!imageElem.size()) {
                imageElem = node.append('image').attr({
                  'class': 'd3QuadFeatureImage', x: 0, y: 0});
              }
              imageElem.attr({
                width: 1,
                height: 1,
                preserveAspectRatio: 'none',
                'xlink:href': d.image.src
              });
            } else {
              imageElem.remove();
            }
          }
        }
      }
    };
    renderer._drawFeatures(feature);

    this.buildTime().modified();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update
   */
  ////////////////////////////////////////////////////////////////////////////
  this._update = function () {
    s_update.call(m_this);
    if (m_this.buildTime().getMTime() <= m_this.dataTime().getMTime() ||
        m_this.buildTime().getMTime() < m_this.getMTime()) {
      m_this._build();
    }
    return m_this;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Initialize
   */
  ////////////////////////////////////////////////////////////////////////////
  this._init = function () {
    s_init.call(m_this, arg);
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Destroy
   */
  ////////////////////////////////////////////////////////////////////////////
  this._exit = function () {
    s_exit.call(m_this);
  };

  m_this._init(arg);
  return this;
};

inherit(d3_quadFeature, quadFeature);

// Now register it
registerFeature('d3', 'quad', d3_quadFeature);
module.exports = d3_quadFeature;
