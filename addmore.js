var wb_counter = 0;
var wb_iteration_refs = {};

(function($) {
    $.fn.addmore = function(wb_options) {
        
        
        if (!wb_options) {
            wb_options = {};
        }

        

        wb_options = wb_set_options_defaults(wb_options);
        wb_options.global_ref_id = wb_create_unique_id();
        
        wb_iteration_refs[wb_options.global_ref_id] = {};
        wb_iteration_refs[wb_options.global_ref_id].wb_add_more_class_ref = {};
        wb_iteration_refs[wb_options.global_ref_id].wb_add_more_root_values = {};
        wb_iteration_refs[wb_options.global_ref_id].wb_add_more_all_values = {};
        
        wb_iteration_refs[wb_options.global_ref_id].wb_reset_parent_value_fields_names = function(value) {
            var parent_value = value.parent_value;
            wb_remove_name_attr($('#' + value.unique_id).parent('.add-more-values-area').children());
            if (!parent_value) {

                var thisref = this;
                var new_index = 0;
                $('#' + value.unique_id).parent('.add-more-values-area').children().each(function() {
                    var value_key = $(this).attr('id');
                    if (thisref.wb_add_more_root_values[value_key]) {
                        thisref.wb_add_more_root_values[value_key].index = new_index;
                        new_index++;
                    }
                });

                for (var value_key in thisref.wb_add_more_root_values) {
                    thisref.wb_add_more_root_values[value_key].set_inputs_names();
                }
            } else {
                parent_value.set_inputs_names();
            }
        };

        var attributes = {};
        $(this).each(function() {
            $.each(this.attributes, function() {
                if (this.specified) {
                    attributes[this.name] = this.value;
                }
            });
        });

        $(this).hide();
        var class_var = new AddMoreClass($(this).html(), wb_options, null, attributes);
        class_var.add_more_name = $(this).attr('data-add-more-name');
        if (!class_var.add_more_name) {
            class_var.add_more_name = class_var.unique_id;
        }
        wb_iteration_refs[wb_options.global_ref_id].wb_add_more_class_ref[class_var.unique_id] = class_var;

        //
        // create add more link
        //
        $(this).after(class_var.produce_add_more_link());


        //
        // prepare refilled values
        //
        $(this).parent().children('.add-more-value').each(function() {
            var value_obj = new AddMoreValue(class_var, $(this).html(), null);
            wb_iteration_refs[wb_options.global_ref_id].wb_add_more_root_values[value_obj.unique_id] = value_obj;
            wb_iteration_refs[wb_options.global_ref_id].wb_add_more_all_values[value_obj.unique_id] = value_obj;
            $('#add_more_values_area_' + class_var.unique_id).append(value_obj.to_string);
            $(this).remove();
        });

        //
        // remove ref
        //
        $(this).remove();

        //
        // create handlers
        //
        class_var.produce_handlers();

        if (parseInt(wb_options.sortable)) {
            // if sortable 
            $('#add_more_values_area_' + class_var.unique_id).sortable({
                stop: function(event, ui) {
                    var value_obj = wb_iteration_refs[wb_options.global_ref_id].wb_add_more_all_values[ui.item.attr('id')];
                    wb_iteration_refs[wb_options.global_ref_id].wb_reset_parent_value_fields_names(value_obj);
                }
            });
        }

        $('body').off('click', '.add-more-value-remove');
        $('body').on('click', '.add-more-value-remove', function(e) {
            var global_ref_id = $(this).data('global-ref-id');
            var value_ref = wb_iteration_refs[global_ref_id].wb_add_more_all_values[$(this).parent().attr('id')];
            if (value_ref.parent_value) {
                delete value_ref.parent_value.children[value_ref.unique_id];
            } else {
                delete wb_iteration_refs[global_ref_id].wb_add_more_root_values[value_ref.unique_id];
            }
            delete wb_iteration_refs[global_ref_id].wb_add_more_all_values[value_ref.unique_id];
            wb_iteration_refs[global_ref_id].wb_reset_parent_value_fields_names(value_ref);
            $(this).parent().remove();

        });

        if (wb_options.onaddmore) {
            class_var.onaddmore = wb_options.onaddmore;
        }

        for (var value_key in wb_iteration_refs[wb_options.global_ref_id].wb_add_more_root_values) {
            wb_iteration_refs[wb_options.global_ref_id].wb_reset_parent_value_fields_names(wb_iteration_refs[wb_options.global_ref_id].wb_add_more_root_values[value_key]);
            break;
        }

        return this;
    };

})(jQuery);


function AddMoreClass(content, wb_options, parent_class, attr) {
    this.refrences = {};
    this.prepared_string = '';
    this.origin_content = content;
    this.unique_id = null;
    this.wb_options = Object.create(wb_options);
    this.onaddmore = function() {};
    this.add_more_name = null;
    this.attr = attr;
    this.parent_class = parent_class;

    // overwrite wb_options
    for(var inx in attr) {
        var regex = /data-option-(.*)/;
        var matches = regex.exec(inx);
        if(matches) {
            this.wb_options[matches[1].replace(/-/g, '_')] = attr[inx];
        }
    }
    this.wb_options = wb_set_options_defaults(this.wb_options);

    this.init();
}

AddMoreClass.prototype = {
    init: function() {
        this.unique_id = wb_create_unique_id();
        this.parse_contents();
    },
    parse_contents: function() {
        //
        // prepare string for parsing
        //
        var prepared_string = wb_prepare_tags_for_parsing(this.origin_content);

        //
        // create refrences
        //
        //var sub_classes_re = /(<([0-9]+)([^>\s]+)\s+data-add-more-class-id[^>]*>)(.*?)<\2\/\3>/i;
        var sub_classes_re = /(<([0-9]+)([a-z0-9]+)[^>]*\s+data-add-more-class-id[^>]*>)(.*?)<\2\/\3>/i;
        var sub_class = sub_classes_re.exec(prepared_string);
        var sub_class_content = '';
        while (sub_class) {
            sub_class_content = sub_class[4].replace(/<[0-9]+/g, '<');
            // get attributes
            var attributes = this.parse_attr(sub_class[1]);
            
            var sub_class_obj = new AddMoreClass(sub_class_content, this.wb_options, this, attributes);
            wb_iteration_refs[this.wb_options.global_ref_id].wb_add_more_class_ref[sub_class_obj.unique_id] = sub_class_obj;
            this.refrences[sub_class_obj.unique_id] = sub_class_obj;
            prepared_string = prepared_string.replace(sub_class[0], '{@ref ' + sub_class_obj.unique_id + '}');
            // get add more name
            var add_more_name = /data-add-more-name\s*=\s*(['"])(.*?)\1/i.exec(sub_class[1]);
            if (add_more_name) {
                sub_class_obj.add_more_name = add_more_name[2];
            } else {
                sub_class_obj.add_more_name = sub_class_obj.unique_id;
            }
            var sub_class = sub_classes_re.exec(prepared_string);
        }
        this.prepared_string = prepared_string;
    },
    parse_attr: function(tag) {
        var attributes = {};
        var tag_split = tag.split(/[\s]/);
        if(tag_split) {
            for(var i=1; i<tag_split.length; i++) {
                // trim
                var trimed_string = tag_split[i].replace(/(^\s+|\s+$)/g, '');
                // remove close tag
                trimed_string = trimed_string.replace(/>$/, '');
                var splitted_string = trimed_string.split('=');
                if(splitted_string) {
                    var attr_name = splitted_string[0];
                    var attr_value = null;
                    splitted_string.shift();
                    if(splitted_string.length) {
                        attr_value = splitted_string.join('=');
                        attr_value = attr_value.replace(/(^["']|["']$)/g, '');
                    }
                    attributes[attr_name] = attr_value;
                }
            }
        }
        return attributes;
    },
    produce_add_more_link: function(unique_id, refilled_value) {
        if (!refilled_value) {
            refilled_value = '';
        }
        if (!unique_id) {
            unique_id = this.unique_id;
        } else {
            unique_id = CryptoJS.MD5(this.unique_id + '_' + unique_id);
        }
        if (this.wb_options.add_more_link_v_pos == 'bottom') {
            return '<div class="add-more-values-area" id="add_more_values_area_' + unique_id + '">' + refilled_value + '</div>' +
                    '<a href="javascript:;" class="add-more-link ' + this.wb_options.add_more_link_classes + '" id="add_more_link_' + unique_id + '">' + this.wb_options.add_more_link_text + '</a>';
        } else {
            return '<a href="javascript:;" class="add-more-link" id="add_more_link_' + unique_id + '">' + this.wb_options.add_more_link_text + '</a>' +
                    '<div class="add-more-values-area ' + this.wb_options.add_more_link_classes + '" id="add_more_values_area_' + unique_id + '">' + refilled_value + '</div>';
        }
    },
    produce_handlers: function(parent_value) {
        var unique_id = this.unique_id;
        if (parent_value) {
            unique_id = CryptoJS.MD5(this.unique_id + '_' + parent_value.unique_id);
        } else {
            parent_value = null;
        }
        var class_ref = this;

        $('body').off('click', '#add_more_link_' + unique_id);
        $('body').on('click', '#add_more_link_' + unique_id, function() {
            var new_value = new AddMoreValue(class_ref, null, parent_value);
            wb_iteration_refs[class_ref.wb_options.global_ref_id].wb_add_more_all_values[new_value.unique_id] = new_value;
            $('#add_more_values_area_' + unique_id).append(new_value.to_string);
            if (!parent_value) {
                wb_iteration_refs[class_ref.wb_options.global_ref_id].wb_add_more_root_values[new_value.unique_id] = new_value;
            }
            wb_iteration_refs[class_ref.wb_options.global_ref_id].wb_reset_parent_value_fields_names(new_value);

            for (var sub_class_id in class_ref.refrences) {
                class_ref.refrences[sub_class_id].produce_handlers(new_value);
            }

            if (parseInt(class_ref.wb_options.sortable)) {
                // if sortable 
                $('#add_more_values_area_' + unique_id).sortable({
                    stop: function(event, ui) {
                        var value_obj = wb_iteration_refs[class_ref.wb_options.global_ref_id].wb_add_more_all_values[ui.item.attr('id')];
                        wb_iteration_refs[class_ref.wb_options.global_ref_id].wb_reset_parent_value_fields_names(value_obj);
                    }
                });
            }
            class_ref.onaddmore(class_ref, new_value);
        });
    }
}

function AddMoreValue(class_obj, parse, parent_value) {
    this.index = 0;
    this.unique_id = wb_create_unique_id();
    this.class_obj = class_obj;
    this.wb_options = class_obj.wb_options;
    this.to_string = '';
    this.refrences = {};
    this.parent_value = parent_value;
    this.children = {};

    if (parent_value) {
        parent_value.children[this.unique_id] = this;
    }

    this.init(parse);
}
AddMoreValue.prototype = {
    init: function(parse) {
        var value = '';
        if (!parse) {
            var contents = this.class_obj.prepared_string.replace(/<[0-9]+/g, '<');
            for (var sub_class_id in this.class_obj.refrences) {
                contents = contents.replace("{@ref " + sub_class_id + "}", this.class_obj.refrences[sub_class_id].produce_add_more_link(this.unique_id));
            }
        } else {
            //
            // prepare string for parsing
            //
            var prepared_string = wb_prepare_tags_for_parsing(parse);

            //
            // create refrences
            //
            var sub_class_index = 0;
            var sub_value_re = /<([0-9]+)([a-z0-9]+)[^>]*\s+class\s*=\s*(['"])(add-more-value|add-more-block)\3[^>]*>(.*?)<\1\/\2>/gi;
            var sub_value = sub_value_re.exec(prepared_string);
            var sub_view_content = '';
            while (sub_value) {
                //
                // get subclass by index
                //
                var sub_class = null;
                var search_sub_class_counter = 0;
                for (var obj_key in this.class_obj.refrences) {
                    if (search_sub_class_counter === sub_class_index) {
                        sub_class = this.class_obj.refrences[obj_key];
                        break;
                    }
                    search_sub_class_counter++;
                }

                if (sub_class) {
                    if (sub_value[4].toLowerCase() == 'add-more-block') {
                        prepared_string = prepared_string.replace(sub_value[0], sub_class.produce_add_more_link(this.unique_id));
                    } else {
                        sub_view_content = sub_value[5].replace(/<[0-9]+/g, '<');
                        var sub_view_obj = new AddMoreValue(sub_class, sub_view_content, this);
                        this.refrences[sub_view_obj.unique_id] = sub_view_obj;
                        wb_iteration_refs[this.wb_options.global_ref_id].wb_add_more_all_values[sub_view_obj.unique_id] = sub_view_obj;
                        prepared_string = prepared_string.replace(sub_value[0], sub_class.produce_add_more_link(this.unique_id, '{@ref ' + sub_view_obj.unique_id + '}'));
                    }
                    sub_class.produce_handlers(this);
                    sub_value = sub_value_re.exec(prepared_string);
                    sub_class_index++;
                } else {
                    break;
                }
            }

            //
            // reset ref
            //
            for (var sub_value_id in this.refrences) {
                prepared_string = prepared_string.replace("{@ref " + sub_value_id + "}", this.refrences[sub_value_id].to_string);
            }

            contents = prepared_string.replace(/<[0-9]+/g, '<');
        }

        var value = '<div class="add-more-value ' + this.wb_options.value_html_classes + '" id="' + this.unique_id + '" style="position: relative;">';
        if (this.wb_options.remove_link_v_pos == 'top') {
            value += '<a href="javascript:;" data-global-ref-id="'+this.wb_options.global_ref_id+'" class="add-more-value-remove ' + this.wb_options.remove_link_classes + '" style="position: absolute; right:0; top: 0;">' + this.wb_options.remove_link_text + '</a>';
        }
        value += contents;
        if (this.wb_options.remove_link_v_pos != 'top') {
            value += '<a href="javascript:;" data-global-ref-id="'+this.wb_options.global_ref_id+'" class="add-more-value-remove ' + this.wb_options.remove_link_classes + '" style="position: absolute; right:0; top: 0;">' + this.wb_options.remove_link_text + '</a>';
        }
        value += '</div>';
        this.to_string = this.set_origin_name(value);
    },
    set_origin_name: function(value) {
        return value.replace(/<([^>]+)\s+name\s*=\s*(['"])(.*?)\2([^>]*)>/gi, '<$1 data-origin-name="$3"$4>');
    },
    jq_ref: function() {
        return $('#' + this.unique_id);
    },
    set_inputs_names: function() {
        wb_add_name_attr(this.jq_ref().children(), this.get_hierarchy_name());

        var new_index = {};
        var thisref = this;
        this.jq_ref().find('.add-more-values-area').children().each(function() {
            var value_key = $(this).attr('id');
            if (thisref.children[value_key]) {
                if (!new_index[thisref.children[value_key].class_obj.add_more_name]) {
                    new_index[thisref.children[value_key].class_obj.add_more_name] = 0;
                }
                thisref.children[value_key].index = new_index[thisref.children[value_key].class_obj.add_more_name];
                new_index[thisref.children[value_key].class_obj.add_more_name]++;
            }
        });

        for (var value_key in this.children) {
            this.children[value_key].set_inputs_names();
        }
    },
    get_hierarchy_name: function() {
        if (this.parent_value) {
            if(this.wb_options.change_inputs_names) {
                var parent_value_name = this.parent_value.get_hierarchy_name();
                if(parent_value_name) {
                    return parent_value_name + '[' + this.class_obj.add_more_name + ']' + '[' + this.index + ']';
                } else {
                    return this.class_obj.add_more_name  + '[' + this.index + ']';
                }
            }
        } else {
            if(this.wb_options.change_inputs_names) {
                return this.class_obj.add_more_name + '[' + this.index + ']';
            }
        }
        return '';
    }

};

function wb_remove_name_attr(js_children) {
    if (js_children) {
        js_children.each(function() {
            $(this).removeAttr('name');
            wb_remove_name_attr($(this).children());
        });
    }
    return;
}

function wb_add_name_attr(js_children, name) {
    if (js_children) {
        js_children.each(function() {
            if (!$(this).hasClass('add-more-value')) {
                var origin_name = $(this).attr('data-origin-name');
                if (origin_name) {
                    if(name) {
                        origin_name = origin_name.replace(/^([^\[]+)/, '[$1]');
                        $(this).attr('name', name + origin_name);
                    } else {
                        $(this).attr('name', origin_name);
                    }
                }
                wb_add_name_attr($(this).children(), name);
            }
        });
    }
    return;
}

function wb_create_unique_id() {
    var id = ++wb_counter + 'id' + Date.now() + '_' + Math.random() + '_' + Math.random();
    return CryptoJS.MD5(id).toString();
}

function wb_prepare_tags_for_parsing(contents) {
    var prepared_string = contents.replace(/[\n\r]/g, ' ');
    var tags_to_indent = prepared_string.match(/<[^\s>]+/g);
    if (tags_to_indent && tags_to_indent.length) {
        var indentation = {};
        var open_tag = '';
        var close_flag = false;
        var tag_name = '';
        for (var i = 0; i < tags_to_indent.length; i++) {
            open_tag = tags_to_indent[i].toLowerCase();
            close_flag = false;
            if (open_tag.match(/<\//)) {
                open_tag = open_tag.replace(/<\//, '<');
                close_flag = true;
            }
            tag_name = open_tag.replace(/</, '');
            if (!indentation.hasOwnProperty(open_tag)) {
                indentation[open_tag] = 0;
            } else if (!close_flag) {
                indentation[open_tag]++;
            }
            var re = new RegExp(tags_to_indent[i], "i");
            if (!close_flag) {
                prepared_string = prepared_string.replace(re, '<' + indentation[open_tag] + tag_name);
            } else {
                prepared_string = prepared_string.replace(re, '<' + indentation[open_tag] + '/' + tag_name);
                indentation[open_tag]--;
            }
        }
    }
    return prepared_string;
}

function wb_set_options_defaults(wb_options) {
    if (!wb_options.change_inputs_names) {
        wb_options.change_inputs_names = 0;
    } else {
        wb_options.change_inputs_names = parseInt(wb_options.change_inputs_names);
    }

    if (!wb_options.add_more_link_text) {
        wb_options.add_more_link_text = 'Add More';
    }

    if (!wb_options.add_more_link_v_pos) {
        wb_options.add_more_link_v_pos = 'top';
    }

    if (!wb_options.add_more_link_classes) {
        wb_options.add_more_link_classes = '';
    }

    if (!wb_options.remove_link_text) {
        wb_options.remove_link_text = 'Remove';
    }

    if (!wb_options.remove_link_v_pos) {
        wb_options.remove_link_v_pos = 'top';
    }

    if (!wb_options.remove_link_classes) {
        wb_options.remove_link_classes = '';
    }

    if (!wb_options.value_html_classes) {
        wb_options.value_html_classes = '';
    }

    if (!wb_options.sortable) {
        wb_options.sortable = 0;
    } else {
        wb_options.sortable = parseInt(wb_options.sortable);
    }

    if (typeof wb_options.init_values === 'undefined') {
        wb_options.init_values = 0;
    }

    return wb_options;
}