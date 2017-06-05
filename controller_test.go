package banner_editor

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/fatih/color"
	"github.com/qor/admin"
	"github.com/qor/banner_editor/test/config/bindatafs"
	"github.com/qor/qor"
	"github.com/qor/qor/test/utils"
)

var (
	mux    = http.NewServeMux()
	Server = httptest.NewServer(mux)
	db     = utils.TestDB()
	Admin  = admin.New(&qor.Config{DB: db})
)

type bannerEditorArgument struct {
	Value string
}

func init() {
	// Banner Editor
	type subHeaderSetting struct {
		Text  string
		Color string
	}
	type buttonSetting struct {
		Text  string
		Link  string
		Color string
	}
	subHeaderRes := Admin.NewResource(&subHeaderSetting{})
	subHeaderRes.Meta(&admin.Meta{Name: "Text"})
	subHeaderRes.Meta(&admin.Meta{Name: "Color"})

	buttonRes := Admin.NewResource(&buttonSetting{})
	buttonRes.Meta(&admin.Meta{Name: "Text"})
	buttonRes.Meta(&admin.Meta{Name: "Link"})
	RegisterViewPath("github.com/qor/banner_editor/test/views")

	RegisterElement(&Element{
		Name:     "Sub Header",
		Template: "sub_header",
		Resource: subHeaderRes,
		Context: func(c *admin.Context, r interface{}) interface{} {
			return r.(QorBannerEditorSettingInterface).GetSerializableArgument(r.(QorBannerEditorSettingInterface))
		},
	})
	RegisterElement(&Element{
		Name:     "Button",
		Template: "button",
		Resource: buttonRes,
		Context: func(c *admin.Context, r interface{}) interface{} {
			setting := r.(QorBannerEditorSettingInterface).GetSerializableArgument(r.(QorBannerEditorSettingInterface)).(*buttonSetting)
			setting.Color = "Red"
			return setting
		},
	})

	bannerEditorResource := Admin.AddResource(&bannerEditorArgument{})
	bannerEditorResource.Meta(&admin.Meta{Name: "Value", Config: &BannerEditorConfig{}})

	if err := db.DropTableIfExists(&QorBannerEditorSetting{}).Error; err != nil {
		panic(err)
	}
	db.AutoMigrate(&QorBannerEditorSetting{})
	Admin.MountTo("/admin", mux)
}

func TestGetConfig(t *testing.T) {
	otherBannerEditorResource := Admin.AddResource(&bannerEditorArgument{}, &admin.Config{Name: "other_banner_editor_argument"})
	otherBannerEditorResource.Meta(&admin.Meta{Name: "Value", Config: &BannerEditorConfig{
		Elements: []string{"Sub Header"},
	}})

	anotherBannerEditorResource := Admin.AddResource(&bannerEditorArgument{}, &admin.Config{Name: "another_banner_editor_argument"})
	anotherBannerEditorResource.Meta(&admin.Meta{Name: "Value", Config: &BannerEditorConfig{
		Elements: []string{"Button"},
	}})

	assertConfigIncludeElements(t, "banner_editor_arguments", []string{"Sub Header", "Button"})
	assertConfigIncludeElements(t, "other_banner_editor_arguments", []string{"Sub Header"})
	assertConfigIncludeElements(t, "another_banner_editor_arguments", []string{"Button"})
}

func TestControllerCRUD(t *testing.T) {
	resp, _ := http.Get(Server.URL + "/admin/qor_banner_editor_settings/new?kind=Sub%20Header")
	assetPageHaveAttributes(t, resp, "Text", "Color")

	resp, _ = http.Get(Server.URL + "/admin/qor_banner_editor_settings/new?kind=Button")
	assetPageHaveAttributes(t, resp, "Text", "Link")

	// Test create setting via HTML request
	resp, _ = http.PostForm(Server.URL+"/admin/qor_banner_editor_settings?kind=Button", url.Values{
		"QorResource.Kind":                  {"Button"},
		"QorResource.SerializableMeta.Text": {"Search by Google"},
		"QorResource.SerializableMeta.Link": {"http://www.google.com"},
	})
	body, _ := ioutil.ReadAll(resp.Body)
	assetPageHaveText(t, string(body), "Search by Google")
	assetPageHaveText(t, string(body), "http://www.google.com")

	resp, _ = http.Get(Server.URL + "/admin/qor_banner_editor_settings/1/edit")
	body, _ = ioutil.ReadAll(resp.Body)
	assetPageHaveText(t, string(body), "Search by Google")
	assetPageHaveText(t, string(body), "http://www.google.com")

	// Test create setting via JSON request
	resp, _ = http.PostForm(Server.URL+"/admin/qor_banner_editor_settings.json?kind=Button", url.Values{
		"QorResource.Kind":                  {"Button"},
		"QorResource.SerializableMeta.Text": {"Search by Yahoo"},
		"QorResource.SerializableMeta.Link": {"http://www.yahoo.com"},
	})
	body, _ = ioutil.ReadAll(resp.Body)
	assetPageHaveText(t, string(body), `{"ID":2,"Template":"<a style='color:Red' href='http://www.yahoo.com'>Search by Yahoo</a>\n"`)

	// Test update setting via JSON request
	resp, _ = http.PostForm(Server.URL+"/admin/qor_banner_editor_settings/2.json?kind=Button", url.Values{
		"_method":                           {"PUT"},
		"QorResource.Kind":                  {"Button"},
		"QorResource.SerializableMeta.Text": {"Search by Bing"},
		"QorResource.SerializableMeta.Link": {"http://www.bing.com"},
	})
	body, _ = ioutil.ReadAll(resp.Body)
	assetPageHaveText(t, string(body), `{"ID":2,"Template":"<a style='color:Red' href='http://www.bing.com'>Search by Bing</a>\n"`)

	// Test Customize AssetFS
	SetAssetFS(bindatafs.AssetFS)
	resp, _ = http.PostForm(Server.URL+"/admin/qor_banner_editor_settings.json?kind=Button", url.Values{
		"QorResource.Kind":                  {"Button"},
		"QorResource.SerializableMeta.Text": {"Search by Baidu"},
		"QorResource.SerializableMeta.Link": {"http://www.baidu.com"},
	})
	body, _ = ioutil.ReadAll(resp.Body)
	assetPageHaveText(t, string(body), `{"ID":3,"Template":"<a style='color:Red' href='http://www.baidu.com'>Search by Baidu</a>\n"`)
}

func assetPageHaveText(t *testing.T, body string, text string) {
	if !strings.Contains(body, text) {
		t.Error(color.RedString("PageHaveText: expect page have text %v, but got %v", text, body))
	}
}

func assetPageHaveAttributes(t *testing.T, resp *http.Response, attributes ...string) {
	body, _ := ioutil.ReadAll(resp.Body)
	for _, attr := range attributes {
		if !strings.Contains(string(body), fmt.Sprintf("QorResource.SerializableMeta.%v", attr)) {
			t.Error(color.RedString("PageHaveAttrributes: expect page have attributes %v, but got %v", attr, string(body)))
		}
	}
}

func assertConfigIncludeElements(t *testing.T, resourceName string, elements []string) {
	resp, _ := http.Get(fmt.Sprintf("%v/admin/%v/new", Server.URL, resourceName))
	body, _ := ioutil.ReadAll(resp.Body)
	results := []string{}
	for _, elm := range elements {
		results = append(results, fmt.Sprintf("{&#34;Name&#34;:&#34;%v&#34;,&#34;CreateUrl&#34;:&#34;/admin/qor_banner_editor_settings/new?kind=%v&#34;}", elm, strings.Replace(elm, " ", "&#43;", -1)))
	}
	resultStr := strings.Join(results, ",")
	assetPageHaveText(t, string(body), fmt.Sprintf("data-configure=\"{&#34;Elements&#34;:[%v],&#34;EditUrl&#34;:&#34;/admin/qor_banner_editor_settings/:id/edit&#34;}\"", resultStr))
}
