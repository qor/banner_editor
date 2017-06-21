package banner_editor

import (
	"encoding/json"
	"fmt"
	"html/template"
	"reflect"

	"github.com/jinzhu/gorm"
	"github.com/qor/admin"
	"github.com/qor/qor"
	"github.com/qor/qor/resource"
	"github.com/qor/serializable_meta"
)

var (
	registeredElements []*Element
	viewPaths          []string
	assetFileSystem    admin.AssetFSInterface
)

func init() {
	assetFileSystem = &admin.AssetFileSystem{}
}

// BannerEditorConfig configure display elements and setting model
type BannerEditorConfig struct {
	AssetManager    *admin.Resource
	Elements        []string
	SettingResource *admin.Resource
}

// QorBannerEditorSettingInterface interface to support customize setting model
type QorBannerEditorSettingInterface interface {
	GetID() uint
	serializable_meta.SerializableMetaInterface
}

// QorBannerEditorSetting default setting model
type QorBannerEditorSetting struct {
	gorm.Model
	serializable_meta.SerializableMeta
}

// Element represent a button/element in banner_editor toolbar
type Element struct {
	Name     string
	Template string
	Resource *admin.Resource
	Context  func(context *admin.Context, setting interface{}) interface{}
}

func init() {
	admin.RegisterViewPath("github.com/qor/banner_editor/views")
}

// RegisterElement register a element
func RegisterElement(e *Element) {
	registeredElements = append(registeredElements, e)
}

// ConfigureQorMeta configure route and funcmap for banner_editor meta
func (config *BannerEditorConfig) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*admin.Meta); ok {
		meta.Type = "banner_editor"
		Admin := meta.GetBaseResource().(*admin.Resource).GetAdmin()

		if config.SettingResource == nil {
			config.SettingResource = Admin.NewResource(&QorBannerEditorSetting{})
		}
		if config.AssetManager == nil {
			panic("BannerEditor: AssetManager can't be blank.")
		} else {
			urlMeta := config.AssetManager.GetMeta("BannerEditorUrl")
			if getAssetManagerResourceURLMethod(config.AssetManager.NewStruct()).IsNil() {
				panic("BannerEditor: AssetManager's struct doesn't have any field implement URL method, please refer media_library.MediaLibrary{}.")
			}
			if urlMeta == nil {
				config.AssetManager.Meta(&admin.Meta{
					Name: "BannerEditorUrl",
					Type: "hidden",
					Valuer: func(v interface{}, c *qor.Context) interface{} {
						values := getAssetManagerResourceURLMethod(v).Call([]reflect.Value{})
						if len(values) > 0 {
							return values[0]
						}
						return ""
					},
				})
				config.AssetManager.IndexAttrs(config.AssetManager.IndexAttrs(), "BannerEditorUrl")
			}
		}

		router := Admin.GetRouter()
		res := config.SettingResource
		router.Get(fmt.Sprintf("%v/new", res.ToParam()), New, &admin.RouteConfig{Resource: res})
		router.Post(fmt.Sprintf("%v", res.ToParam()), Create, &admin.RouteConfig{Resource: res})
		router.Put(fmt.Sprintf("%v/%v", res.ToParam(), res.ParamIDName()), Update, &admin.RouteConfig{Resource: res})
		Admin.RegisterResourceRouters(res, "read", "update")

		Admin.RegisterFuncMap("banner_editor_configure", func(config *BannerEditorConfig) string {
			type element struct {
				Name      string
				CreateURL string
			}
			var (
				selectedElements = registeredElements
				elements         = []element{}
				newElementURL    = router.Prefix + fmt.Sprintf("/%v/new", res.ToParam())
			)
			if len(config.Elements) != 0 {
				selectedElements = []*Element{}
				for _, name := range config.Elements {
					if e := GetElement(name); e != nil {
						selectedElements = append(selectedElements, e)
					}
				}
			}
			for _, e := range selectedElements {
				elements = append(elements, element{Name: e.Name, CreateURL: fmt.Sprintf("%v?kind=%v", newElementURL, template.URLQueryEscaper(e.Name))})
			}
			results, err := json.Marshal(struct {
				Elements []element
				EditURL  string
			}{
				Elements: elements,
				EditURL:  fmt.Sprintf("%v/%v/:id/edit", router.Prefix, res.ToParam()),
			})
			if err != nil {
				return err.Error()
			}
			return string(results)
		})
	}
}

// GetElement returnn element struct by name
func GetElement(name string) *Element {
	for _, e := range registeredElements {
		if e.Name == name {
			return e
		}
	}
	return nil
}

// GetID return setting ID
func (setting QorBannerEditorSetting) GetID() uint {
	return setting.ID
}

// GetSerializableArgumentResource return setting's resource
func (setting QorBannerEditorSetting) GetSerializableArgumentResource() *admin.Resource {
	element := GetElement(setting.Kind)
	if element != nil {
		return element.Resource
	}
	return nil
}

func getAssetManagerResourceURLMethod(i interface{}) reflect.Value {
	value := reflect.Indirect(reflect.ValueOf(i))
	for i := 0; i < value.NumField(); i++ {
		field := value.Field(i)
		if urlMethod := field.MethodByName("URL"); urlMethod.IsValid() {
			return urlMethod
		}
	}
	return reflect.Value{}
}
