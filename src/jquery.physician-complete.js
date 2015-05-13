// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

  "use strict";

  // undefined is used here as the undefined global variable in ECMAScript 3 is
  // mutable (ie. it can be changed by someone else). undefined isn't really being
  // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
  // can no longer be modified.

  // window and document are passed through as local variable rather than global
  // as this (slightly) quickens the resolution process and can be more efficiently
  // minified (especially when both are regularly referenced in your plugin).

  // Create the defaults once
  var pluginName = "physicianComplete",
      defaults = {
        bloomURI: "http://www.bloomapi.com/api/"
      },
      template = "<div class=\"physician-complete-suggestion\"><div class=\"physician-complete-suggestion-fullname\"></div>" +
                 "<div class=\"physician-complete-suggestion-npi\"></div>" +
                 "<div class=\"physician-complete-suggestion-address\"></div></div>";

  // The actual plugin constructor
  function Plugin ( element, options ) {
    this.element = element;
    // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin
    this.settings = $.extend( {}, defaults, options );
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  }

  // Avoid Plugin.prototype conflicts
  $.extend(Plugin.prototype, {
    init: function () {
      // this.settings are options, this.element is element selected for plugin
      var $elm = $(this.element),
          $body = $("body"),
          randomId = Math.random(),
          $complitionResults = $("<div class=\"physician-complete\" style=\"position: absolute;\" id=\"" + randomId + "\"></div>"),
          that = this;

      // Exepected behavior:
      // - If item in list clicked
      //     1) emit selected on click
      //     2) fill text with item clicked
      //     3) collapse list
      // - If Enter is pressed
      //     1) fill text with item highlighted
      //     2) collapse list
      // - If up/ down arrow pressed
      //     1) move highlight up/ down -- if moving past beginning or end of list, do nothing
      //     2) emit selected with item highlighted
      // - If tab is pressed
      //     1) fill text with item highlighted
      //     2) re-search
      // - If other typing occurs in text box
      //     1) re-search after 300 ms
      //     2) emit selected with item highlighted

      // - If first result changes
      //     1) emit selected on first result

      $body.append($complitionResults);
      $complitionResults.hide();

      function select (result) {
        var last = $complitionResults.data("physician-complete-last-seleted");
        if (result != last) {
          $complitionResults.data("physician-complete-last-seleted", result);
          $elm.trigger("selected", result);
        }
      }

      function populate (results) {
        var width = $elm.outerWidth(),
            height = $elm.outerHeight(),
            position = $elm.offset(),
            last;
        
        position.top += height;

        $complitionResults.css(position);
        $complitionResults.width(width);

        $complitionResults.empty();

        $complitionResults.data("physician-complete-selected-index", null);
        $complitionResults.data("physician-complete-results", results);
        last = $complitionResults.data("physician-complete-last-seleted");

        $.each(results, function (index, result) {
          var $suggestion = $(template);

          if (last != null && result.npi == last.npi) {
            $suggestion.addClass("physician-complete-suggestion-active");
            $complitionResults.data("physician-complete-selected-index", index);
          }

          $suggestion.find(".physician-complete-suggestion-fullname").text(result.first_name + " " + result.last_name);
          $suggestion.find(".physician-complete-suggestion-address").text(result.practice_address.city + ", " + result.practice_address.state + " " + result.practice_address.zip.substring(0,5));
          $suggestion.find(".physician-complete-suggestion-npi").text(result.npi);
          $suggestion.data("result", result);
          $suggestion.data("index", index);

          $suggestion.mouseenter(function (evt) {
            var $this = $(this),
                index = $this.data("index");
            $complitionResults.find(".physician-complete-suggestion-active").removeClass("physician-complete-suggestion-active");
            $complitionResults.data("physician-complete-selected-index", index);
            $this.addClass("physician-complete-suggestion-active");
          });

          $suggestion.click(function (evt) {
            var result = $(this).data("result");
            select(result);
            $elm.val(result.first_name + " " + result.last_name);
            $complitionResults.empty();
            $complitionResults.data("physician-complete-selected-index", null);
            $complitionResults.data("physician-complete-results", null);
            $complitionResults.hide();
          });

          $complitionResults.append($suggestion);

          (function (r) {
            $suggestion.on("click", function (evt) {
              select(r);
            });
          })(result);
        });

        $complitionResults.show();
      }

      $complitionResults.mouseleave(function (evt) {
        $complitionResults.find(".physician-complete-suggestion-active").removeClass("physician-complete-suggestion-active");
        $complitionResults.data("physician-complete-selected-index", null);
      })

      $elm.on("keydown", function (evt) {
        if (evt.which == 9) { // tab
          var index = $complitionResults.data("physician-complete-selected-index"),
              $selected,
              result;

          if (index == null) {
            index = 0;
          }

          $selected = $($complitionResults.find(".physician-complete-suggestion")[index]);

          if($selected.length == 0) {
            return;
          }

          evt.preventDefault();
          result = $selected.data("result");
          $elm.val(result.first_name + " " + result.last_name);
          select(result);
          // TODO: re-search

          return;
        } else if (evt.which == 13) {
          evt.preventDefault();
        }
      });

      $elm.on("keyup", function (evt) {
        if (evt.which == 38) { // arrow up
          var index = $complitionResults.data("physician-complete-selected-index"),
              $selectedChild;
          if (index == null) {
            return;
          } else if (index == 0) {
            return;
          }

          index -= 1;
          $complitionResults.find(".physician-complete-suggestion-active").removeClass("physician-complete-suggestion-active");
          $selectedChild = $($complitionResults.find(".physician-complete-suggestion")[index]);
          $selectedChild.addClass("physician-complete-suggestion-active");
          $complitionResults.data("physician-complete-selected-index", index);
          select($selectedChild.data("result"));

          return;
        } else if (evt.which == 40) { // arrow down
          var index = $complitionResults.data("physician-complete-selected-index"),
              size = $complitionResults.find(".physician-complete-suggestion").length,
              $selectedChild;
          if (index == null && size == 0) {
            return
          } else if (index == null) {
            index = 0;
          } else if (index == size - 1) {
            return;
          } else {
            index += 1;
          }

          $complitionResults.find(".physician-complete-suggestion-active").removeClass("physician-complete-suggestion-active");
          $selectedChild = $($complitionResults.find(".physician-complete-suggestion")[index]);
          $selectedChild.addClass("physician-complete-suggestion-active");
          $complitionResults.data("physician-complete-selected-index", index);
          select($selectedChild.data("result"));

          return;
        } else if (evt.which == 13) { // enter
          var index = $complitionResults.data("physician-complete-selected-index"),
              $selected,
              result;

          if (index != null) {
            $selected = $($complitionResults.find(".physician-complete-suggestion")[index]);
            result = $selected.data("result");
            $elm.val(result.first_name + " " + result.last_name);
          }

          $complitionResults.empty();
          $complitionResults.data("physician-complete-selected-index", null);
          $complitionResults.data("physician-complete-results", null);
          $complitionResults.hide();

          return;
        }

        var value = $elm.val().trim(),
            parts = value.split(/\s+/g),
            queryIndex = 1,
            query = "?limit=5&",
            firstName, lastName;

        if (typeof that.settings.zipCode != "undefined") {
          query += "key1=practice_address.zip&op1=prefix&value1=" + that.settings.zipCode + "&"; 
          queryIndex = 2;
        }

        if (that.timerId) {
          window.clearTimeout(that.timerId);
          delete that.timerId;
        }

        if (parts.length == 0 || parts[0] == null || parts[0] == "") {
          $complitionResults.empty();
          $complitionResults.data("physician-complete-selected-index", null);
          $complitionResults.data("physician-complete-results", null);
          $complitionResults.hide();
          return;
        } else if (parts.length == 1) {
          firstName = parts[0];
          query += "key" + queryIndex + "=first_name&op" + queryIndex + "=prefix&value" + queryIndex + "=" + firstName.toLowerCase();
        } else {
          firstName = parts[0];
          lastName = parts[parts.length - 1];
          query += "key" + queryIndex + "=first_name&op" + queryIndex + "=fuzzy&value" + queryIndex + "=" + firstName.toLowerCase();
          queryIndex += 1;
          query += "&key" + queryIndex + "=last_name&op" + queryIndex + "=prefix&value" + queryIndex + "=" + lastName.toLowerCase();
        }

        that.timerId = window.setTimeout(function () {
          $.ajax({
            url: that.settings.bloomURI + "search/usgov.hhs.npi" + query,
            dataType: "jsonp",
            cache: true,
            success: function (response) {
              populate(response.result)
            },
            error: function (err) {
              console.log(err)
            }
          })
        }, 500);
      })
    }
  });

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[ pluginName ] = function ( options ) {
    return this.each(function() {
      if ( !$.data( this, "plugin_" + pluginName ) ) {
        $.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
      }
    });
  };

})( jQuery, window, document );
