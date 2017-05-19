package banner_editor

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
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
	var (
		res     = context.Resource
		result  = res.NewStruct()
		kind    = context.Request.Form.Get("QorResource.Kind")
		element = GetElement(kind)
		t       = template.Must(template.New("Template").Parse(element.Template))
		html    = bytes.Buffer{}
	)
	if context.AddError(res.Decode(context.Context, result)); !context.HasError() {
		context.AddError(res.CallSave(result, context.Context))
	}

	c := element.Context(context, result)
	if err := t.Execute(&html, c); err != nil {
		context.AddError(errors.New(fmt.Sprintf("BannerEditor: can't parse %v's template, got %v", kind, err)))
	}
	if context.HasError() {
		responder.With("html", func() {
			context.Writer.WriteHeader(admin.HTTPUnprocessableEntity)
			context.Execute("new", result)
		}).With([]string{"json"}, func() {
			context.Writer.WriteHeader(admin.HTTPUnprocessableEntity)
			context.Encode("index", map[string]interface{}{"errors": context.GetErrors()})
		}).Respond(context.Request)
	} else {
		responder.With("html", func() {
			context.Flash(string(res.GetAdmin().T(context.Context, "qor_admin.form.successfully_created", "{{.Name}} was successfully created", res)), "success")
			http.Redirect(context.Writer, context.Request, context.URLFor(result, res), http.StatusFound)
		}).With([]string{"json"}, func() {
			json, err := settingJSON(html, result)
			if err != nil {
				panic(err)
			}
			context.Writer.Write(json)
		}).Respond(context.Request)
	}
}

func Update(context *admin.Context) {
	var (
		res     = context.Resource
		kind    = context.Request.Form.Get("QorResource.Kind")
		element = GetElement(kind)
		t       = template.Must(template.New("Template").Parse(element.Template))
		html    = bytes.Buffer{}
	)
	result, err := context.FindOne()

	if err != nil {
		context.AddError(err)
	} else {
		if context.AddError(res.Decode(context.Context, result)); !context.HasError() {
			context.AddError(res.CallSave(result, context.Context))
		}

		c := element.Context(context, result)
		if err := t.Execute(&html, c); err != nil {
			context.AddError(errors.New(fmt.Sprintf("BannerEditor: can't parse %v's template, got %v", kind, err)))
		}
	}

	if context.HasError() {
		context.Writer.WriteHeader(admin.HTTPUnprocessableEntity)
		responder.With("html", func() {
			context.Execute("edit", result)
		}).With([]string{"json", "xml"}, func() {
			context.Encode("edit", map[string]interface{}{"errors": context.GetErrors()})
		}).Respond(context.Request)
	} else {
		responder.With("html", func() {
			context.FlashNow(string(res.GetAdmin().T(context.Context, "qor_admin.form.successfully_updated", "{{.Name}} was successfully updated", res)), "success")
			context.Execute("show", result)
		}).With([]string{"json"}, func() {
			json, err := settingJSON(html, result)
			if err != nil {
				panic(err)
			}
			context.Writer.Write(json)
		}).Respond(context.Request)
	}
}

func settingJSON(html bytes.Buffer, result interface{}) ([]byte, error) {
	jsonValue := &bytes.Buffer{}
	encoder := json.NewEncoder(jsonValue)
	encoder.SetEscapeHTML(false)
	err := encoder.Encode(struct {
		ID       uint
		Template string
	}{
		ID:       result.(QorBannerEditorSettingInterface).GetID(),
		Template: html.String(),
	})
	if err != nil {
		return nil, err
	}
	return jsonValue.Bytes(), nil
}
