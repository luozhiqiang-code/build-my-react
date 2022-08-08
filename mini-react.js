/**
 * 创建React Element对象的函数，也是JSX编译的结果。
 * @param {*} type elemnt对象的类型
 * @param {*} props element对象的props
 * @param  {...any} children element对象的children，也是props的属性。
 * @returns 返回一个React Element对象（用于创建fiber的数据结构）
 */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}
/**
 * 创建文本element对象的函数
 * @param {*} text 文本节点的文本
 * @returns 返回一个类型为文本的element对象
 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      child: [],
    },
  };
}
/**
 *
 * @param {*} element 传入的element对象
 * @param {*} container element对象生成的fiber节点挂载的真实DOM容器
 */

/**
 * 根据element（对应fiber）,创建真实的DOM
 * @param {*} fiber element元素对应的fiber
 * @returns
 */
function createDom(fiber) {
  //根据element对象的类型创建对应的真实DOM
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  const isProperty = (key) => key !== "children";
  
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });
  return dom;
}

const isEvent = key=>key.startsWith('on')
const isProperty = (key) => key !== "children"&&!isEvent(key);
const isNew = (pre,next)=>key=>pre[key]!==next[key];
const isGone = (prev,next)=>key=>!(key in next)
updateDom(dom,prevProps,nextProps){
  //删除property
  Object.keys(prevProps).filter(isProperty).filter(isGone(prevProps,nextProps)).forEach(name=>{dom[name]=''})
  //增加或者修改property
  Object.keys(nextProps).filter(isProperty).filter(isNew(prevProps,nextProps)).forEach(name=>{dom[name] = nextProps[name]})
  //移除事件（事件不存在或者事件函数发生改变）
  Object.keys(prevProps).filter(isEvent).filter(key=>!(key in nextProps)||isNew(prevProps,nextProps)(key)).forEach(name=>{
    const eventType = name.toLowerCase().substring(2);
    dom.removeEventListener(eventType,prevProps[name])
  })
  //增加事件
  Object.keys(prevProps).filter(isEvent).filter(isNew(prevProps,nextProps)).forEach(name=>{
    const eventType = name.toLowerCase().substring(2);
    dom.addEventlistener(eventType,nextProps[name]);}
    )
}

//提交workInProgress树上的任务
function commitRoot() {
  //优先执行删除队列中的任务，如果要删除父节点和子节点，先删除父节点就行
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  //更新当前任务后，更新currentRoot指针指向与当前DOM对于的fiber
  currenRoot = wipRoot;
  //workInProgress指针置空，便于后续使用
  wipRoot = null;
}

//提交任务的函数，也就是真实挂载DOM
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  //如果是函数组件fiber，fiber是没有DOM的，需要向父节点遍历，找到有DOM的才能操作
  while(!domParentFiber.dom){
    domParentFiber = domParentFiber.parent;
  }

  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {//替换操作
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.document !== null) {//更新操作
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {//删除操作
    commitDeletion(fiber,domParent);
  }
  //继续提交子节点的更新
  commitWork(fiber.child);
  //继续提交兄弟节点的更新
  commitWork(fiber.sibling);
}

function commitDeletion(fiber,domParent){
  if(fiber.dom){
    domParent.removeChild(fiber.dom);
  }else{
    commitDeletion(fiber.child,domParent)
  }
}


/**
 * 渲染fiber的函数，也就是根据JSX生成的element创建 workInProgress fiber树
 * @param {*} element JSX生成的element
 * @param {*} container 真实DOM容器
 */
function render(element, container) {
  //workInProgressRoot 工作中的树，也就是内存中新生成的fiber树
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currenRoot,
  };
  //删除队列
  deletions = [];
  //标记下一个工作节点的指针
  nextUnitOfWork = wipRoot;
}


let nextUnitOfWork = null; //下一个渲染工作单元指针，用于遍历fiber进行渲染
let currenRoot = null;//指向当前DOM结构对应的就fiber树
let wipRoot = null;//指向当前生成的fiber树的指针
let deletions = null;//删除队列


/**
 * 渲染函数，遍历fiber链表执行渲染任务
 * @param {*} deadline 当前任务截止时间
 */
function workLoop(deadline) {
  //标志位，用于标志当前是否该让出线程（如果截止时间不够就得让出）
  let shouldYield = false;
  //遍历fiber链表执行渲染任务，当截止时间不够或者遍历到链表末位则停止
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaning() < 1;
  }
  //一旦完成了wipRoot这颗树上的所有任务，也就是beginWork阶段完成，要开始commit
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  //利用requestIdleCallback分时间片渲染
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);
/**
 * 执行渲染任务的函数
 * @param {*} nextUnitOfWork 下一个待执行的任务
 */
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  /**
   * 组件有两种类型
   * 1.函数组件:函数组件的fiber没有对于的dom，并且子节点由函数运行得来，而不是从props属性中获取
   * 2.DOM组件
   */
  
  if(isFunctionComponent){
    updateFuntionComponent(fiber);
  }else{
    updateHostComponent(fiber)
  }
  
  //1.深度优先遍历，先从子节点进入
  //2.到底后遍历兄弟节点
  //3.到兄弟节点的最后一个时，向上返回，然后从uncle节点开始2

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

let wipFiber = null;
let hookIndex = null;


//更新函数组件
function updateFuntionComponent(fiber){
 
  wipFiber = fiber; //指向workInProgress fiber树中节点的指针
  hookIndex = 0;//hooks队列中当前hook的下标
  wipFiber.hooks = [];//hooks队列
  const children = [fiber.type(fiber.props)];//函数组件的fiber挂载的内容，集return中的JSX生产的内容
  reconcileChldren(fiber,children);//继续协调return的内容
}


/**
 * useState钩子函数
 * @param {*} initial 初始值
 * @returns 返回 最新值和更新值的API
 */
function useState(initial){
//如果旧fiber上有hook则复用，否则初始化
const oldHook = wipFiber.alternate&&wipFiber.alternate.hooks&&wipFiber.alternate.hooks[hookIndex];
const hook={
  state:oldHook?oldHook.state:initial,
  que:[],
}

//更新队列
const actions = oldHook?oldHook.que:[];
//执行更新队列
actions.forEach(action=>{
  hook.state = action(hook.state);
})

//更新api
const setState = action=>{
  hook.que.push(action);
  //setStat执行完，数据发送变化。 workInProgress fiber要更新。
  wipRoot = {
    dom:currenRoot.dom,
    props:currenRoot.props,
    alternate:currenRoot
  }
  nextUnitOfWork = wipRoot;
  deletions=[];
}

//将当前hook放入hooks
wipFiber.hooks.push(hook);
hookIndex++;
return [hook.state,setState]

}

//更新真实DOM组件
function updateHostComponent(fiber){
  //如果当前fiber的dom不存在则创建其DOM节点
  if(!fiber.dom){
    fiber.dom = createDom(fiber);
  }
  //继续协调子节点
  reconcileChldren(fiber,fiber.props.children);
}

/**
 * 协调每个组件下的子节点（注意区分nextUnitOfWork）
 * @param {*} wipFiber 组件的workInProgress fiber节点
 * @param {*} elements workInProgress fiber节点下应该渲染的子节点
 */
function reconcileChldren(wipFiber, elements) {
  let index = 0;
  //协调过程中复用旧节点的子节点
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null; //指向上一个兄弟节点的指针
  //构建子节点的fiber树形链表结构
  while (index < element.length || oldFiber != null) {
    const element = elements[index];

    //根据element类型判断新旧fiber是否相同
    const sameType = oldFiber && element && element.type == oldFiber.type;
    //新旧相同，则复用旧fiber的DOM、type
    if (sameType) {
      const newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    //新旧不同，则创建新的fiber节点
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    //新旧不同，且旧节点存在，则要删除旧节点
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }
    //如果下标为0，则是第一个子节点,应该挂载到wipFiber下
    if (index === 0) {
     wipFiber.child = newFiber;
    } else {
    //如果下标不为0，则要挂载兄弟节点
      prevSibling.sibling = newFiber;
    }
    //更新指针和下标便于下一次挂载
    prevSibling = newFiber;
    index++;
  }
}

const React = {
  createElement,
  render,
  useState,
};

/** @jsx React.createElement */
function Counter() {
  const [state, setState] = React.useState(1);

  // return <h1 onclick={() => setState((c) => c + 1)}>Count:{state} </h1>;
  return React.createElement('h1',{onclick:() => setState((c) => c + 1)},'Count')
}

const element = <Counter />;

const container = document.getElementById("root");
React.render(element, container);
