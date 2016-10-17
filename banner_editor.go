package banner_editor

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/qor/admin"
	"github.com/qor/qor/resource"
)

type BannerEditorConfig struct {
	Width    int64
	Height   int64
	Elements []*Element
	Fixed    bool
}

type Element struct {
	Name     string
	Template string
	Resource *admin.Resource
}

func init() {
	admin.RegisterViewPath("github.com/qor/banner_editor/views")
}

func (bannerEditorConfig *BannerEditorConfig) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*admin.Meta); ok {
		meta.Type = "banner_editor"
		Admin := meta.GetBaseResource().(*admin.Resource).GetAdmin()
		Admin.RegisterFuncMap("banner_editor_configure", func() string {
			config := meta.Config.(*BannerEditorConfig)
			configJSON := map[string]interface{}{}
			elementsJSON := map[string]interface{}{}
			for _, element := range config.Elements {
				elementSetting := map[string]interface{}{}
				elementSetting["title"] = element.Name
				elementSetting["template"] = element.Template
				metasSetting := map[string]interface{}{}
				for _, meta := range element.Resource.Metas {
					metasSetting[meta.Name] = map[string]string{
						"default": "aaa",
						"type":    meta.Type,
					}
				}
				elementSetting["keys"] = metasSetting
				elementsJSON[strings.Replace(element.Name, " ", "_", -1)] = elementSetting
			}

			configJSON["width"] = config.Width
			configJSON["height"] = config.Height
			configJSON["elements"] = elementsJSON
			configJSON["fixed"] = config.Fixed
			jsonString, _ := json.Marshal(configJSON)
			return string(jsonString)
		})
	}
}

func (bannerEditorConfig *BannerEditorConfig) GetTemplate(context *admin.Context, metaType string) ([]byte, error) {
	return nil, errors.New("not implemented")
}
