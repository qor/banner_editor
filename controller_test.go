package banner_editor

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/fatih/color"
	"github.com/qor/admin"
	"github.com/qor/qor"
	"github.com/qor/qor/test/utils"
)

var (
	mux    = http.NewServeMux()
	Server = httptest.NewServer(mux)
	db     = utils.TestDB()
	Admin  = admin.New(&qor.Config{DB: db})
)

func init() {

	// Banner Editor
	type bannerEditorArgument struct {
		Value string
	}
	type subHeaderSetting struct {
		Text  string
		Color string
	}
	type buttonSetting struct {
		Text string
		Link string
	}
	subHeaderRes := Admin.NewResource(&subHeaderSetting{})
	subHeaderRes.Meta(&admin.Meta{Name: "Text"})
	subHeaderRes.Meta(&admin.Meta{Name: "Color"})

	buttonRes := Admin.NewResource(&buttonSetting{})
	buttonRes.Meta(&admin.Meta{Name: "Text"})
	buttonRes.Meta(&admin.Meta{Name: "Link"})

	RegisterElement(&Element{
		Name:     "Sub Header",
		Template: "<em style=\"color: {{Color}};\">{{Text}}</em>",
		Resource: subHeaderRes,
		Context: func(c *Context, r interface{}) *Context {
			return c
		},
	})
	RegisterElement(&Element{
		Name:     "Button",
		Template: "<a href='{{Link}}'>{{Text}}</a>",
		Resource: buttonRes,
		Context: func(c *Context, r interface{}) *Context {
			return c
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

func TestControllerCRUD(t *testing.T) {
	resp, _ := http.Get(Server.URL + "/admin/qor_banner_editor_settings/new?kind=Sub%20Header")
	assetPageHaveAttributes(t, resp, "Text", "Color")

	resp, _ = http.Get(Server.URL + "/admin/qor_banner_editor_settings/new?kind=Button")
	assetPageHaveAttributes(t, resp, "Text", "Link")

	resp, _ = http.PostForm(Server.URL+"/admin/qor_banner_editor_settings?kind=Button", url.Values{
		"QorResource.Kind":                  {"Button"},
		"QorResource.SerializableMeta.Text": {"Search by Google"},
		"QorResource.SerializableMeta.Link": {"http://www.google.com"},
	})
	time.Sleep(time.Second * 1)
	body, _ := ioutil.ReadAll(resp.Body)
	assetPageHaveText(t, string(body), "Search by Google")
	assetPageHaveText(t, string(body), "http://www.google.com")
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
