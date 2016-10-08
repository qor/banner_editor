package banner_editor

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/qor/admin"
	"github.com/qor/qor/resource"
)

type BannerEditorConfig struct {
	Elements []*Element
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
		Admin.RegisterFuncMap("convert_visual_editor_setting", func() string {
			config := meta.Config.(*BannerEditorConfig)
			settingJson := map[string]interface{}{}
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
				settingJson[strings.Replace(element.Name, " ", "_", -1)] = elementSetting
			}

			jsonString, _ := json.Marshal(settingJson)
			return string(jsonString)
		})
	}
}

func (bannerEditorConfig *BannerEditorConfig) GetTemplate(context *admin.Context, metaType string) ([]byte, error) {
	return nil, errors.New("not implemented")
}
