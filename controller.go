package banner_editor

import (
	"errors"
	"fmt"

	"github.com/qor/admin"
)

type bannerEditorController struct {
	Resource *admin.Resource
}

func (bc bannerEditorController) New(context *admin.Context) {
	setting := bc.Resource.NewStruct().(QorBannerEditorSettingInterface)
	kind := context.Request.URL.Query().Get("kind")
	if GetElement(kind) != nil {
		setting.SetSerializableArgumentKind(kind)
	} else {
		context.AddError(errors.New(fmt.Sprintf("BannerEditor: It isn't any element match %v", kind)))
	}
	context.Execute("new", setting)
}
