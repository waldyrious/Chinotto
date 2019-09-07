/* FUCK YEAH, ES5 RIGHT UP IN THIS BITCH. SUCK MY VEIN-ENCRUSTED IIFE, BROWSERIFY. */
(function(window){
	"use strict";
	const Chai = window.chai;
	
	window.extendChai = () => {
		
		/**
		 * Check if an {@link HTMLElement} contains one or more CSS classes.
		 * @name      class
		 * @alias     classes
		 * @memberof! Chai.Assertion.prototype
		 * @example   document.body.should.have.class("content");
		 *            expect($(".btn.large")).to.have.classes("btn", "large");
		 */
		addMethod(["class", "classes"], function(...expected){
			const any     = Chai.util.flag(this, "any");
			let subjects  = Chai.util.flag(this, "object");
			subjects      = "length" in subjects ? Array.from(subjects) : [subjects];
			expected      = flattenList(expected);
			
			for(const {classList, className} of subjects){
				let matched = expected.filter(name =>  classList.contains(name));
				let missing = expected.filter(name => !classList.contains(name));
				const value = any ? matched.length : !missing.length;
				const names = classList.length ? `classList "${className}"` : "empty classList";
				missing     = formatList(expected.filter(n => missing.includes(n)), any ? "or" : "and");
				matched     = formatList(expected.filter(n => matched.includes(n)), any ? "or" : "and");
				
				this.assert(
					value,
					`expected ${names} to include ${missing}`,
					`expected ${names} not to include ${matched}`,
					expected.join(" "),
					className
				);
			}
		});


		/**
		 * Assert that an {@link HTMLElement} is rendered in the DOM tree.
		 * @name      drawn
		 * @memberof! Chai.Assertion.prototype
		 * @example   document.body.should.be.drawn;
		 *            document.head.should.not.be.drawn;
		 */
		addProperty("drawn", function(){
			let subject = Chai.util.flag(this, "object");
			if(subject.jquery)
				subject = subject[0];
			
			const bounds = subject.getBoundingClientRect();
			const {top, right, bottom, left} = bounds;
			
			this.assert(
				right - left > 0 || bottom - top > 0,
				"expected element to be drawn",
				"expected element not to be drawn"
			);
		});


		/**
		 * Assert that an {@link HTMLElement} has user focus, or contains something which does.
		 * @name      focus
		 * @memberof! Chai.Assertion.prototype
		 * @example   document.activeElement.should.have.focus;
		 *            document.createElement("div").should.not.have.focus;
		 */
		addProperty("focus", function(){
			const ae = document.activeElement;
			
			let subject = Chai.util.flag(this, "object");
			if(subject.jquery)
				subject = subject[0];
			
			if(subject instanceof HTMLElement)
				this.assert(
					ae === subject || ae.contains(subject),
					"expected element to have focus",
					"expected element not to have focus"
				);
			
			else if(subject.element instanceof HTMLElement)
				this.assert(
					ae === subject.element || ae.contains(subject.element),
					"expected #{this} to have focus",
					"expected #{this} not to have focus"
				);
			
			else throw new TypeError("subject is not an HTMLElement or component-like object");
		});
	}


	/**
	 * Variant of {@link Chai.Assertion.addMethod} that supports plugin aliases.
	 *
	 * @see     {@link https://www.chaijs.com/api/plugins/#addMethod}
	 * @example addMethod(["pointTo", "pointingTo"], function(target){ … });
	 * @param   {String|String[]} names
	 * @param   {Function} fn
	 * @return  {void}
	 */
	function addMethod(names, fn){
		for(const name of "string" === typeof names ? [names] : names)
			Chai.Assertion.addMethod(name, fn);
	}


	/**
	 * Variant of {@link Chai.Assertion.addProperty} that supports plugin aliases.
	 *
	 * @see     {@link https://www.chaijs.com/api/plugins/#addProperty}
	 * @example addProperty(["coloured", "colored"], fn);
	 * @param   {String|String[]} names
	 * @param   {Function} fn
	 * @return  {void}
	 */
	function addProperty(names, fn){
		for(const name of "string" === typeof names ? [names] : names)
			Chai.Assertion.addProperty(name, fn);
	}


	/**
	 * Variant of {@link defineAssertions} that defines only one assertion.
	 *
	 * @param {String|String[]} names
	 * @param {Function} handler
	 * @return {void}
	 */
	function defineAssertion(names, handler){
		names = flattenList(names).join(", ");
		return defineAssertions({[names]: handler});
	}


	/**
	 * Wrapper for defining simple custom Chai assertions.
	 *
	 * @param {Object} spec
	 * @example <caption>Defining a "colour" assertion</caption>
	 *    // Typical definition:
	 *    defineAssertions({
	 *       ["colour, coloured"](subject, expected){
	 *           const actual = subject.colour;
	 *           this.assert(
	 *               actual === expected,
	 *               "expected #{this} to be coloured #{exp}",
	 *               "expected #{this} not to be coloured #{exp}",
	 *               expected,
	 *               actual
	 *           );
	 *       },
	 *    });
	 *
	 *    // Usage:
	 *    expect({colour: 0xFF0000}).to.have.colour(0xFF0000);
	 *    expect({colour: "red"}).not.to.be.coloured("green");
	 *
	 * @example <caption>Shorthand for the above</caption>
	 *    defineAssertions({
	 *       ["colour, coloured"](subject, expected){
	 *           return [
	 *               subject.colour === expected,
	 *               "to be coloured #{exp}",
	 *           ];
	 *       },
	 *    });
	 *
	 * @todo Elaborate on examples further; they're still confusing.
	 * @see {@link http://chaijs.com/api/plugins/#method_addmethod}
	 * @return {void}
	 */
	function defineAssertions(spec){
		for(let [names, handler] of Object.entries(spec)){
			const fn = function(...args){
				const subject = Chai.util.flag(this, "object");
				const results = handler.call(this, subject, ...args);
				if(!Array.isArray(results)) return;
				if(2 === results.length && "string" === typeof results[1]){
					const suffix = results[1].trim();
					results[1] = `expected #{this} ${suffix}`;
					results[2] = `expected #{this} not ${suffix}`;
				}
				if(args.length > 0){
					const tag = /#{(?:exp|act)}/;
					if(results.length < 4 && (tag.test(results[1]) || tag.test(results[2])))
						results.push(args[0], results[0]);
				}
				this.assert(...results);
			};
			names = [...new Set(names.trim().split(/[,\s]+/g).filter(Boolean))];
			for(const name of names)
				handler.length < 2
					? Chai.Assertion.addProperty(name, fn)
					: Chai.Assertion.addMethod(name, fn);
		}
	}


	/**
	 * "Flatten" a (possibly nested) list of strings into a single-level array.
	 *
	 * Strings are split by whitespace as separate elements of the final array.
	 *
	 * @param {Array|String} input
	 * @param {WeakSet} [refs=null]
	 * @return {String[]} An array of strings
	 * @internal
	 */
	function flattenList(input, refs = null){
		refs = refs || new WeakSet();
		input = "string" === typeof input
			? [input]
			: refs.add(input) && Array.from(input).slice();
		
		const output = [];
		for(const value of input){
			if(!value) continue;
			switch(typeof value){
				case "object":
					if(refs.has(value)) continue;
					refs.add(value);
					output.push(...flattenList(value, refs));
					break;
				default:
					output.push(...String(value).trim().split(/\s+/));
			}
		}
		return output;
	}


	/**
	 * Format a list of strings for human-readable output.
	 *
	 * @example
	 *    formatList(["A", "B"])            == '"A" and "B"';
	 *    formatList(["A", "B", "C"])       == '"A", "B", and "C"';
	 *    formatList(["A", "B", "C"], "or") == '"A", "B", or "C"';
	 *
	 * @param {String[]} list
	 * @param {String} [rel="and"]
	 * @return {String}
	 * @internal
	 */
	function formatList(list, rel = "and"){
		const inspect = input => JSON.stringify(input);
		list = [...list];
		if(list.length > 1){
			list = list.map(inspect);
			const last = list.pop();
			return list.join(", ")
				+ (list.length > 2 ? "," : "")
				+ ` ${rel} ${last}`;
		}
		else{
			list = list.map(inspect).join(", ") || "''";
			return list;
		}
	}
}(this));
