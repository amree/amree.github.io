---
layout: post
title: Automatically Sign JARs Using Ant and Bash
meta-description: This script will basically sign the jars after all the jars has been build.
comments: true
---

#{{ page.title }}

This guide is more towards Netbeans project, but it can be used as a reference for you to customize the script to suit your needs.

**signer.bash**

{% highlight bash %}
#!/bin/bash
find . -name "*.jar" -exec jarsigner -keystore /path/to/your/key -storepass yourpassword '{}' yourkeystorename \;
echo 'JARs signed';
exit 0
{% endhighlight %}

This script **will search all files ending with .jar** from the current directory recursively and **then sign it**. This means, it can be used separately without ant script. Just make it executable and run it.

Put this in the last line of your `build.xml` but it must before the closing tag of the "project" (`build.xml` can be found in your main project directory)

**build.xml**

{% highlight xml %}
<project>
    .
    .
    .
    <target name="-post-jar">
        <exec dir="${dist.dir}" executable="/path/to/your/signer.bash" os="Linux" />
    </target>
</project>
{% endhighlight %}

This script will basically sign the jars after all the jars has been build. Please note that it'd better if you set all the path using absolute path.

After this, you just have to use **Clean and Build** to generate the jars and also automatically sign it. This script will also sign all of your included libraries. 

Good luck :)