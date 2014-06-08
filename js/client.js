$(function () {
    var sra = new SRA(DATA);
    var marksTemplate = Handlebars.compile($("#marks-template").html());


    Handlebars.registerHelper('prop', function(o, k) {
        return o[k] || "-";
    });

    sra.updateUser(1);
    console.log(sra.badUsers);

    $("#data").empty().append(marksTemplate(sra));

    $("select").on("change", function () {
        sra.updateUser(this.value);
        $("#data").empty().append(marksTemplate(sra));
    });

    $("#newData").click(function () {
        sra.includeNewData(NEW_DATA);

        var s = "Los usuarios: ";
        for(var i=0; i<sra.badUsers.length; i++) {
            s+=sra.badUsers[i] + " ";
        }

        if(sra.badUsers.length == 0)  s = "";
        else s+=" parecen estar haciendo un uso fraudulento";

        $("#data").empty().append(marksTemplate(sra));
        $("select").change();
        $("#data").prepend("<h4 class='text-danger text-center'>"+s+"</h4>");
    })

});