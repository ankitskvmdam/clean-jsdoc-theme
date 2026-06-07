1. We want to add the option to opt for grouping sidebar items. "clubSidebarItems". What it does that it will club related items together sidebar items into groups. For example we have base and  base/chain current in the sidebar, similarly we have queue
queue/AbstractJob
queue/externals
queue/interfaces
queue/mixins
queue/Queue
queue/RetryJob
queue/types, if clubSidebarItems is enabled, these will be grouped together, meaning we have base as parent and index and chain as child, similarly we have queue as parent and AbstractJob, externals, interfaces, mixins, Queue, RetryJob as children.
2. For source file line, the line number we are using is actually the first line of the comment rather than the first line of the function/method/interface/class. What we want is to use the first line of the function/method/interface/class instead, because now when we land on the code we see comments, and comments are too long and the actual code is hard to notice. Make this configurable. by default we we land to the first line of the code, but if developers want to opt-out, they can pass a config in jsdoc.config (use suitable key). Note, we also need to make sure that if there is only one element like "string/format" then it should be be clubbed. (see setu/docs/todo-content-structuring.md). Note this should work similar for tutorials.
3. When we open a new page, the highlighted sidebar item should be in the view, ideally top.
4. Search Function.
