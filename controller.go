package banner_editor

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/qor/admin"
	"github.com/qor/responder"
)

func New(context *admin.Context) {
	setting := context.Resource.NewStruct().(QorBannerEditorSettingInterface)
	kind := context.Request.URL.Query().Get("kind")
	if GetElement(kind) != nil {
		setting.SetSerializableArgumentKind(kind)
	} else {
		context.AddError(errors.New(fmt.Sprintf("BannerEditor: It isn't any element match %v", kind)))
	}
	context.Execute("new", setting)
}

func Create(context *admin.Context) {
	res := context.Resource
	result := res.NewStruct()
	if context.AddError(res.Decode(context.Context, result)); !context.HasError() {
		context.AddError(res.CallSave(result, context.Context))
	}

	if context.HasError() {
		responder.With("html", func() {
			context.Writer.WriteHeader(admin.HTTPUnprocessableEntity)
			context.Execute("new", result)
		}).With([]string{"json", "xml"}, func() {
			context.Writer.WriteHeader(admin.HTTPUnprocessableEntity)
			context.Encode("index", map[string]interface{}{"errors": context.GetErrors()})
		}).Respond(context.Request)
	} else {
		responder.With("html", func() {
			context.Flash(string(res.GetAdmin().T(context.Context, "qor_admin.form.successfully_created", "{{.Name}} was successfully created", res)), "success")
			http.Redirect(context.Writer, context.Request, context.URLFor(result, res), http.StatusFound)
		}).With([]string{"json", "xml"}, func() {
			context.Encode("show", result)
		}).Respond(context.Request)
	}
}
