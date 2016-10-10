$(document).ready(function(){
  $(".js-banner-editor").each(function() {
    $(this).parents(".qor-field__block").css("overflow-x", "scroll");
  });
  $(".js-banner-editor").each(function(i, e) {
    var configure = $(e).data("configure");
    $(e).vee({
      width: configure.width,
      height: configure.height,
      datas : configure.elements
    })
  });
});
