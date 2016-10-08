$(document).ready(function(){
  $(".js-banner-editor").each(function() {
    $(this).parents(".qor-field__block").css("overflow-x", "scroll");
  });
  $(".js-banner-editor").each(function(i, e) {
    var datas = $(e).data("configure");
    $(e).vee({
      width: "1060",
      height: "400",
      datas : datas
    })
  });
});
