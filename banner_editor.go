package banner_editor

import (
	"errors"
	"fmt"
	"html/template"

	"github.com/jinzhu/gorm"
	"github.com/qor/admin"
	"github.com/qor/qor/resource"
	"github.com/qor/serializable_meta"
)

var (
	registeredElements []*Element
)

type Context struct {
	DB       *gorm.DB
	Options  map[string]interface{}
	FuncMaps template.FuncMap
}

type BannerEditorConfig struct {
	Elements        []string
	SettingResource *admin.Resource
}

type QorBannerEditorSettingInterface interface {
	serializable_meta.SerializableMetaInterface
}

type QorBannerEditorSetting struct {
	gorm.Model
	serializable_meta.SerializableMeta
}

type Element struct {
	Name     string
	Template string
	Resource *admin.Resource
	Context  func(context *Context, setting interface{}) *Context
}

func init() {
	admin.RegisterViewPath("github.com/qor/banner_editor/views")
}

func RegisterElement(e *Element) {
	registeredElements = append(registeredElements, e)
}

func (config *BannerEditorConfig) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*admin.Meta); ok {
		meta.Type = "banner_editor"
		Admin := meta.GetBaseResource().(*admin.Resource).GetAdmin()

		if config.SettingResource == nil {
			config.SettingResource = Admin.NewResource(&QorBannerEditorSetting{})
		}

		router := Admin.GetRouter()
		controller := bannerEditorController{
			Resource: config.SettingResource,
		}
		router.Get(fmt.Sprintf("%v/new", config.SettingResource.ToParam()), controller.New, &admin.RouteConfig{Resource: config.SettingResource})
	}
}

func (bannerEditorConfig *BannerEditorConfig) GetTemplate(context *admin.Context, metaType string) ([]byte, error) {
	return nil, errors.New("not implemented")
}

func GetElement(name string) *Element {
	for _, e := range registeredElements {
		if e.Name == name {
			return e
		}
	}
	return nil
}

func (setting QorBannerEditorSetting) GetSerializableArgumentResource() *admin.Resource {
	element := GetElement(setting.Kind)
	if element != nil {
		return element.Resource
	}
	return nil
}
