
/**
 * Uses the CSS background image of a targeted element to fill the element with
 * that image. Where CSS3 is not supported some additional markup will be
 * injected into the DOM and an img element will be positioned and resized to
 * simulate the intended image behavior.
 * The main aim of this plugin is to provide support for older browsers when it
 * comes to:
 * background-size: cover;
 * and
 * background-size: contain;
 *
 * @see http://www.css3.info/preview/background-size/
 * 
 */
(function($) {

    // Create jiggybit namespace if it doesn't exist
    window.jiggybit = typeof(window.jiggybit) === 'undefined' ? {} : window.jiggybit;

    /**
     * Create imagefill plugin in the jQuery fn namespace
     */
    $.extend($.fn, {
        ImageFill: function(options)
        {
            $.extend($.fn.ImageFill.prototype, {
                defaults: window.jiggybit.ImageFill.defaults,
                prototype: window.jiggybit.ImageFill
            });
            return new $.fn.ImageFill.prototype(options, this);
        }
    });

    /**
     * Attaches the settings to the plugin and instantiates it
     *
     * @param {object} options Configuration options for this plugin instance
     * @param {jQuery object} $spaces The elements to manipulate
     */
    $.fn.ImageFill.prototype = function(options, $spaces) {
        this.settings = $.extend(true, {}, $.fn.ImageFill.prototype.defaults, options);
        this.$spaces = $spaces;
        this.initialise();
    };

    /**
     * The hash the plugin is constructed from
     * @type {object}
     */
    jiggybit.ImageFill =
    {
        /**
         * Default settings for this plugin
         * @type {object}
         */
        defaults: {

            /**
             * Set to true to receive some debug information on the console
             * 
             * @type {boolean}
             */
            debug: false,

            /**
             * Desired background position for the backgorund image. This controls
             * whether the image is being centered or aligned top left, bottom right,
             * or other.
             *
             * @type {string}
             */
            position: '50% 50%',

            /**
             * If the contain keyword is used, the background image is scaled, while preserving the image's
             * original proportions/aspect ratio, so as to be as large as possible providing that it is
             * contained within the background positioning area, ie. neither the image’s width or height
             * exceed the background positioning area. As such, depending on whether or not the proportions
             * of the background image match those of the background positioning area, there may be some
             * areas of the background which are not covered by the background image.
             *
             * If the cover keyword is the used, the background image is scaled, again preserving the image's
             * original proportions/aspect ratio, this time to be as large as possible so that the background
             * positioning area is completely covered by the background image, ie. both the images width or
             * height are equal to or exceed the background positioning area. As such, again depending on
             * whether or not the proportions of the background image match those of the background positioning
             * area, some parts of the background image may not be in view within the background positioning
             * area.
             *
             * @type {string}
             */
            method: 'cover', // contain or cover

            /**
             * Set to true/false to prevent this plugin determining whether css3
             * background-size is supported
             *
             * @type {mixed}
             */
            css3: null
        },

        /**
         * Live settings after defaults and passed options have been merged
         * @type {object}
         */
        settings: {},

        /**
         * Collection of DOM nodes that are managed by this plugin instance
         * @type {object}
         */
        $spaces: {},

        /**
         * True if css support for background-size is detected
         * @type {boolean}
         */
        css3: false,

        /**
         *
         *
         */
        isIE: false,

        /**
         * Plugin initialisation
         */
        initialise: function()
        {
            var thisRef = this;

            if (this.settings.css3 !== null) {
                this.css3 = this.settings.css3;
            // Determine if we have backgroundSize support with help of Modernizr
            } else if ($('html').hasClass('backgroundsize')) {
                this.css3 = true;
            } else {
                // Determine ourselves
                var testDiv = document.createElement('div');
                if (testDiv.style.backgroundSize === undefined) this.css3 = false;
                else this.css3 = true;
            }

            // Detect if we're on IE
            // @see http://www.javascriptkit.com/javatutors/navigator.shtml
            if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
                this.isIE = true;
            }

            // Iterate 'spaces' and work that magic
            this.$spaces.each(function(idx) {
                var $el = $(this);
                // Check if we have css3 support
                if (thisRef.css3) {
                    // Yes, simply apply requested behavior using CSS3
                    $el.css({
                        '-webkit-background-size': thisRef.settings.method,
                        '-moz-background-size': thisRef.settings.method,
                        'background-size': thisRef.settings.method,
                        'background-position': thisRef.settings.position
                    });
                } else {
                    // Nope, jump through hoops
                    var img = new Image(),
                    imgSrc = $el.css('background-image').slice(5, -2);
                    //$el.css('background-image', 'none');
                    img.src = imgSrc + (thisRef.isIE ? '?ts='+ new Date().getTime() : '');
                    img.onerror = function() {
                        if (thisRef.settings.debug) {
                            console.log('The following URL does not seem to be delivering an image: ' + img.src);
                        }
                    };
                    // For IE to be able to follow the class, we need to do this for jQuery.
                    // Otherwise the width and height are not available until we have added
                    // the thing to the DOM. For the same reason we're bouncing the image width
                    // and height around as arguments
                    window.log(img.src);
                    $(img).load(function() {
                        window.log('loaded');
                        thisRef.injectImage($el, this.width, this.height);
                    });
                }
            });

            // Check if we're doing the css3 variant
            if (this.css3 === false) {
                // Some work on window resize required
                $(window).resize(function() {
                    thisRef.refresh();
                });
            }
        },

        /**
         * Creates the required pseudo markup. A new < div > with an < img > in
         * it.
         *
         * @private
         * @param {object} $el jQueryified target element
         * @param {integer} imgWidth Image width
         * @param {integer} imgHeight Image height
         * @return {void}
         */
        injectImage: function($el, imgWidth, imgHeight)
        {
            var imgSrc = $el.css('background-image').slice(5, -2),
                spaceWidth = $el.width(),
                spaceHeight = $el.height();

            // Prep target element to allow for desired pseudo behavior
            $el.css({
                background: 'none'
                //position: 'relative'
            });

            // Assign position to target element so we can read it from there and
            // can minimise string interpretation on our end. Call me lazy..
            $el.css('background-position', this.settings.position);

            // We need a background image of course
            if (imgSrc !== '') {
                // Create div
                var $bg = $(document.createElement('div')).css({
                    position: 'absolute',
                    zIndex: -1,
                    width: spaceWidth,
                    height: spaceHeight,
                    top: 0,
                    left: 0,
                    overflow: 'hidden'
                });

                // Create img
                var $img = $(document.createElement('img')).attr({
                        src: imgSrc,
                        alt: ''
                    })
                    //.css(styles)
                    .data('llif-position', this.getBackgroundPosition($el))
                    //.data('llif-position', $el.css('background-position'))
                    .appendTo($bg);

                // Set image dimensions and position it
                this.drawImage($img, spaceWidth, spaceHeight, imgWidth, imgHeight);

                // Store reference to element for easy access
                $el.data('llif-bg', $bg);
                $el.data('llif-img', $img);

                // Append pseudo background element to DOM
                $bg.appendTo($el);
            }
        },

        /**
         * Resizes and positions the embedded image using negative margins
         *
         * @private
         * @param {object} $img Reference to image object we're manipulating
         * @param {integer} spaceWidth Current width of the target element
         * @param {integer} spaceHeight Current height of the target element
         * @param {integer} imgWidth Image width
         * @param {integer} imgHeight Image height
         * @return {void}
         */
        drawImage: function($img, spaceWidth, spaceHeight, imgWidth, imgHeight)
        {
            // Get real image dimensions
            var imgRatio = imgWidth / imgHeight,
                spaceRatio = spaceWidth / spaceHeight,
                targetHeight = 0, targetWidth = 0,
                styles = {},
                position = $img.data('llif-position'),
                vertical = '0%', horizontal = '0%',
                fill;

            // Determine desired behavior
            if (this.settings.method === 'contain') {
                // Determine which way to fill out
                if (imgRatio < spaceRatio) fill = 'height';
                else fill = 'width';
            } else if (this.settings.method === 'cover') {
                if (imgRatio > spaceRatio) fill = 'height';
                else fill = 'width';
            }

            if (fill === 'height') {
                // Fill out to height
                targetHeight = spaceHeight;
                targetWidth = imgWidth * (targetHeight / imgHeight);
                // Compute required offset
                horizontal = position.split(' ')[0];
                switch (horizontal) {
                    case '0%':
                        styles.marginLeft = 0;
                        break;
                    case '100%':
                        styles.marginLeft = (spaceWidth - targetWidth);
                        break;
                    default:
                        // Align centered
                        styles.marginLeft = (spaceWidth - targetWidth) / 2;
                }
                styles.marginTop = 'auto';
            } else {
                // Fill out to width
                targetWidth = spaceWidth;
                targetHeight = imgHeight * (targetWidth / imgWidth);
                // Compute required negative offset
                vertical = position.split(' ')[1];
                switch (vertical) {
                    case '0%':
                        styles.marginTop = 0;
                        break;
                    case '100%':
                        styles.marginTop = (spaceHeight - targetHeight);
                        break;
                    default:
                        // Vertical align centered
                        styles.marginTop = (spaceHeight - targetHeight) / 2;
                }
                styles.marginLeft = 'auto';
            }

            // Set dimensions
            styles.width = parseInt(targetWidth);
            styles.height = parseInt(targetHeight);

            // Update css in one
            $img.css(styles);
        },

        /**
         * Get css background-position string from element.
         *
         * @private
         * @param {object} $el Target element
         * @return {string} CSS background position value
         */
        getBackgroundPosition: function($el)
        {
            // IE only supports non standard background-position-x &
            // background-position-y
            if (this.isIE) {
                var x = $el.css('background-position-x');
                switch (x) {
                    case 'center':
                        x = '50%';
                        break;
                    case 'left':
                        x = '0%';
                        break;
                    case 'right':
                        x = '100%';
                        break;
                }
                var y = $el.css('background-position-y');
                switch (y) {
                    case 'center':
                        y = '50%';
                        break;
                    case 'top':
                        y = '0%';
                        break;
                    case 'bottom':
                        y = '100%';
                        break;
                }
                return x + ' ' + y;
            } else {
                return $el.css('background-position');
            }
        },

        /**
         * Allows manual trigger of redraw
         *
         * @return {void}
         */
        refresh: function()
        {
            var thisRef = this;
            this.$spaces.each(function(idx) {
                var $el = $(this),
                    $bg = $el.data('llif-bg'),
                    $img = $el.data('llif-img'),
                    spaceWidth = $el.width(),
                    spaceHeight = $el.height();
                // If no background image was attached to the targetted element,
                // $bg isn't
                try {
                    // Re-size the background div
                    $bg.css({
                        width: spaceWidth,
                        height: spaceHeight
                    });
                    // And re-position the image within it
                    thisRef.drawImage($img, spaceWidth, spaceHeight, $img[0].width, $img[0].height);
                } catch (exception) {
                    // Raise awareness
                    if (thisRef.settings.debug) {
                        try {
                            console.log('Element has no background image assigned to it:');
                            console.log($el);
                        } catch (exception) {
                            alert('Maybe debug using a browser with a console?!');
                        }
                    }
                }
            });
        }
    };

})(jQuery);

